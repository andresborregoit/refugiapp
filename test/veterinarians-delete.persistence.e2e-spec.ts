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
import { MediaResourceType } from '../src/modules/media/domain/enums/media-resource-type.enum';
import { PASSWORD_NOTIFICATION_GATEWAY } from '../src/modules/auth/domain/services/password-notification.gateway';
import { AuditAction } from '../src/modules/audit-logs/domain/enums/audit-action.enum';
import { AuditLogOrmEntity } from '../src/modules/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.orm-entity';
import { MedicalRecordType } from '../src/modules/medical-records/domain/enums/medical-record-type.enum';
import { MedicalRecordOrmEntity } from '../src/modules/medical-records/infrastructure/persistence/typeorm/entities/medical-record.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { VeterinarianOrmEntity } from '../src/modules/veterinarians/infrastructure/persistence/typeorm/entities/veterinarian.orm-entity';

const TEST_PASSWORD = 'Rfg187-Integration-Password';
const ADMIN_EMAIL = 'admin.rfg187@refugiapp.test';
const MANAGER_EMAIL = 'manager.rfg187@refugiapp.test';
const VET_USER_EMAIL = 'vet-user.rfg187@refugiapp.test';
const API_PREFIX = '/api/v1';

describe('DELETE /api/v1/veterinarians/:id with PostgreSQL persistence (e2e)', () => {
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
        publicId: `rfg-187/${Math.random().toString(36).slice(2)}`,
        secureUrl: 'https://example.test/rfg-187/asset.png',
        format: 'png',
        bytes: 16,
        resourceType: MediaResourceType.IMAGE,
      }),
    ),
    delete: jest.fn(async (_publicId: string) => undefined),
  };

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-187-test-only-secret-with-at-least-32-characters';
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

    const veterinarianResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/veterinarians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Sofia', lastName: 'Martinez', licenseNumber: 'VET-RFG187' })
      .expect(201);
    const veterinarianId = veterinarianResponse.body.id as string;

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/${veterinarianId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/${veterinarianId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/${veterinarianId}`)
      .expect(401);

    expect(
      await database.getRepository(VeterinarianOrmEntity).countBy({ id: veterinarianId }),
    ).toBe(1);
  });

  it('returns 404 for a missing veterinarian', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/11111111-1111-4111-8111-111111111111`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('RESOURCE_NOT_FOUND');
      });
  });

  it('returns 409 VETERINARIAN_HAS_HISTORY and keeps the clinical history intact', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);

    const veterinarianResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/veterinarians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Marta',
        lastName: 'Gomez',
        licenseNumber: 'VET-RFG187-HIST',
        email: 'marta.gomez@refugiapp.test',
      })
      .expect(201);
    const veterinarianId = veterinarianResponse.body.id as string;

    const animalResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Luna', species: 'dog', intakeDate: '2025-01-10' })
      .expect(201);
    const animalId = animalResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/medical-records`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId,
        veterinarianId,
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Periodic check',
        occurredAt: '2025-01-15T10:00:00.000Z',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/${veterinarianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)
      .expect(({ body }) => {
        expect(body.code).toBe('VETERINARIAN_HAS_HISTORY');
      });

    expect(
      await database.getRepository(VeterinarianOrmEntity).countBy({ id: veterinarianId }),
    ).toBe(1);
    expect(
      await database
        .getRepository(MedicalRecordOrmEntity)
        .countBy({ veterinarianId }),
    ).toBe(1);
  });

  it('deletes a veterinarian without history, removes the row and audits veterinarian.delete', async () => {
    const adminToken = await seedAndLogin(ADMIN_EMAIL, [UserRole.ADMIN]);

    const veterinarianResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/veterinarians`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Carlos',
        lastName: 'Perez',
        licenseNumber: 'VET-RFG187-DEL',
        email: 'carlos.perez@refugiapp.test',
      })
      .expect(201);
    const veterinarianId = veterinarianResponse.body.id as string;

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/veterinarians/${veterinarianId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    expect(
      await database.getRepository(VeterinarianOrmEntity).countBy({ id: veterinarianId }),
    ).toBe(0);

    const auditEntries = await database.getRepository(AuditLogOrmEntity).find({
      where: { action: AuditAction.VETERINARIAN_DELETE, resourceId: veterinarianId },
    });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0]?.resourceType).toBe('veterinarian');
    expect(auditEntries[0]?.metadata).toMatchObject({
      email: 'carlos.perez@refugiapp.test',
      licenseNumber: 'VET-RFG187-DEL',
    });
  });

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-187',
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