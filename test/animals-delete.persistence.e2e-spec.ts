import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  IsolatedPostgres,
  resetDatabase,
  startIsolatedPostgres,
  teardownPersistence,
} from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import {
  CloudinaryStorageService,
  CloudinaryUploadResult,
  UploadFileOptions,
} from '../src/modules/media/infrastructure/cloudinary/cloudinary-storage.service';
import { MediaOwnerType } from '../src/modules/media/domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../src/modules/media/domain/enums/media-resource-type.enum';
import { PASSWORD_NOTIFICATION_GATEWAY } from '../src/modules/auth/domain/services/password-notification.gateway';
import { AuditAction } from '../src/modules/audit-logs/domain/enums/audit-action.enum';
import { AuditLogOrmEntity } from '../src/modules/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.orm-entity';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { MediaAssetOrmEntity } from '../src/modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg188-Integration-Password';
const ADMIN_EMAIL = 'admin.rfg188@refugiapp.test';
const MANAGER_EMAIL = 'manager.rfg188@refugiapp.test';
const VET_USER_EMAIL = 'vet-user.rfg188@refugiapp.test';
const API_PREFIX = '/api/v1';

describe('DELETE /api/v1/animals/:id with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;
  const passwordNotificationGateway = {
    sendPasswordReset: jest.fn<Promise<void>, [string, string, Date]>(),
    sendPasswordChanged: jest.fn<Promise<void>, [string]>(),
  };

  const cloudinaryStorage: jest.Mocked<
    Pick<CloudinaryStorageService, 'buildUploadFolder' | 'upload' | 'delete'>
  > = {
    buildUploadFolder: jest.fn((ownerType, ownerId) =>
      ownerType && ownerId ? `refugiapp/${ownerType}/${ownerId}` : 'refugiapp/orphan',
    ),
    upload: jest.fn(
      async (
        _fileBuffer: Buffer,
        _options: UploadFileOptions,
      ): Promise<CloudinaryUploadResult> => ({
        publicId: `rfg-188/${Math.random().toString(36).slice(2)}`,
        secureUrl: 'https://example.test/rfg-188/asset.png',
        format: 'png',
        bytes: 16,
        resourceType: MediaResourceType.IMAGE,
      }),
    ),
    delete: jest.fn(async (_publicId: string) => undefined),
  };

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-188-test-only-secret-with-at-least-32-characters';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_ISSUER = 'refugiapp-api-test';
    process.env.JWT_AUDIENCE = 'refugiapp-test-client';
    process.env.CLOUDINARY_CLOUD_NAME = '';
    process.env.CLOUDINARY_API_KEY = '';
    process.env.CLOUDINARY_API_SECRET = '';

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CloudinaryStorageService)
      .useValue(cloudinaryStorage)
      .overrideProvider(PASSWORD_NOTIFICATION_GATEWAY)
      .useValue(passwordNotificationGateway)
      .compile();

    database = moduleRef.get(DataSource);
    await database.runMigrations({ transaction: 'each' });

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    passwordHash = await hashPassword(TEST_PASSWORD);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase(database);
  });

  afterAll(async () => {
    await teardownPersistence({ dataSource: database, app, isolated });
  });

  it('returns 403 for non-admin roles and 401 without a token', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);
    await seedUser(MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    await seedUser(VET_USER_EMAIL, [UserRole.VETERINARIAN]);
    const managerToken = await login(MANAGER_EMAIL);
    const vetToken = await login(VET_USER_EMAIL);

    const animalId = await createAnimal(adminToken, { name: 'Luna', species: 'dog' });

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(403);

    await request(app.getHttpServer()).delete(`${API_PREFIX}/animals/${animalId}`).expect(401);

    expect(await countAnimals(animalId)).toBe(1);
  });

  it('returns 404 for a missing animal', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/11111111-1111-4111-8111-111111111111`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('RESOURCE_NOT_FOUND');
      });
  });

  it('returns 409 ANIMAL_UNDER_TREATMENT without deleting the animal', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);
    const animalId = await createAnimal(adminToken, { name: 'Tom', species: 'cat' });

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/animals/${animalId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: AnimalStatus.UNDER_TREATMENT })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('ANIMAL_UNDER_TREATMENT');
      });

    expect(await countAnimals(animalId)).toBe(1);
  });

  it('returns 409 ANIMAL_HAS_PENDING_TASKS without deleting the animal', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);
    const animalId = await createAnimal(adminToken, { name: 'Milo', species: 'dog' });

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ animalId, title: 'Give breakfast' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('ANIMAL_HAS_PENDING_TASKS');
      });

    expect(await countAnimals(animalId)).toBe(1);
  });

  it('returns 409 ANIMAL_HAS_HISTORY when the animal has clinical or expense history', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);

    const withRecordId = await createAnimal(adminToken, { name: 'Nina', species: 'dog' });
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/medical-records`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId: withRecordId,
        recordType: 'consultation',
        title: 'Periodic check',
        occurredAt: '2025-06-15T10:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${withRecordId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('ANIMAL_HAS_HISTORY');
      });

    const withExpenseId = await createAnimal(adminToken, { name: 'Rex', species: 'dog' });
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId: withExpenseId,
        category: 'food',
        amountCents: 1500,
        currency: 'ARS',
        description: 'Food bag',
        incurredAt: '2025-06-15T10:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${withExpenseId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('ANIMAL_HAS_HISTORY');
      });

    expect(await countAnimals(withRecordId)).toBe(1);
    expect(await countAnimals(withExpenseId)).toBe(1);
  });

  it('returns 409 ANIMAL_HAS_HISTORY when the animal has an adoption application', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);
    const animalId = await createAnimal(adminToken, { name: 'Sasha', species: 'dog' });

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/animals/${animalId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: AnimalStatus.AVAILABLE_FOR_ADOPTION })
      .expect(200);

    const adopterResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/adopters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Suarez',
        email: 'ana.suarez@refugiapp.test',
        phone: '+5491123456789',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals/${animalId}/adoption-applications`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adopterId: adopterResponse.body.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('ANIMAL_HAS_HISTORY');
      });

    expect(await countAnimals(animalId)).toBe(1);
  });

  it('soft deletes the animal, detaches its photo, keeps it out of reads and audits animal.delete', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);
    const animalId = await createAnimal(adminToken, { name: 'Toby', species: 'dog' });

    const media = await database.getRepository(MediaAssetOrmEntity).save(
      database.getRepository(MediaAssetOrmEntity).create({
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: animalId,
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'rfg-188/toby-profile',
        secureUrl: 'https://example.test/rfg-188/toby.png',
        metadata: {},
      }),
    );
    await database
      .getRepository(AnimalOrmEntity)
      .update(animalId, { profilePhotoMediaId: media.id });

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const softDeleted = await database
      .getRepository(AnimalOrmEntity)
      .findOne({ where: { id: animalId }, withDeleted: true });
    expect(softDeleted?.deletedAt).not.toBeNull();
    expect(
      await database.getRepository(AnimalOrmEntity).countBy({ id: animalId }),
    ).toBe(0);

    const detachedMedia = await database
      .getRepository(MediaAssetOrmEntity)
      .findOne({ where: { id: media.id } });
    expect(detachedMedia?.ownerType).toBeNull();
    expect(detachedMedia?.ownerId).toBeNull();

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/animals/${animalId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    const auditEntries = await database.getRepository(AuditLogOrmEntity).find({
      where: { action: AuditAction.ANIMAL_DELETE, resourceId: animalId },
    });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.resourceType).toBe('animal');
    expect(auditEntries[0]?.metadata).toMatchObject({
      name: 'Toby',
      species: 'dog',
      status: AnimalStatus.ADMITTED,
    });
  });

  async function createAnimal(
    token: string,
    overrides: { name: string; species: string },
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...overrides, intakeDate: '2025-01-10' })
      .expect(201);

    return response.body.id as string;
  }

  async function countAnimals(id: string): Promise<number> {
    return database.getRepository(AnimalOrmEntity).countBy({ id });
  }

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-188',
        lastName: 'Fixture',
        roles,
        isActive: true,
      }),
    );
  }

  async function seedAndLogin(email: string, roles: UserRole[]): Promise<string> {
    await seedUser(email, roles);
    return login(email);
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    return response.body.accessToken as string;
  }
});
