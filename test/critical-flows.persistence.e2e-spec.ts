import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { AnimalHistoryEventType } from '../src/modules/animals/domain/enums/animal-history-event-type.enum';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { AnimalHistoryEventOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { ExpenseCategory } from '../src/modules/expenses/domain/enums/expense-category.enum';
import { ExpenseOrmEntity } from '../src/modules/expenses/infrastructure/persistence/typeorm/entities/expense.orm-entity';
import { MediaOwnerType } from '../src/modules/media/domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../src/modules/media/domain/enums/media-resource-type.enum';
import {
  CloudinaryStorageService,
  CloudinaryUploadResult,
  UploadFileOptions,
} from '../src/modules/media/infrastructure/cloudinary/cloudinary-storage.service';
import { MediaAssetOrmEntity } from '../src/modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { MedicalRecordType } from '../src/modules/medical-records/domain/enums/medical-record-type.enum';
import { MedicalRecordOrmEntity } from '../src/modules/medical-records/infrastructure/persistence/typeorm/entities/medical-record.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg45-Integration-Password';
const ADMIN_EMAIL = 'admin.rfg45@refugiapp.test';
const API_PREFIX = '/api/v1';

describe('Critical flows with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let postgres: StartedPostgreSqlContainer | undefined;
  let passwordHash: string;

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
        publicId: `rfg-45/${randomUUID()}`,
        secureUrl: 'https://example.test/rfg-45/asset.png',
        format: 'png',
        bytes: 16,
        resourceType: MediaResourceType.IMAGE,
      }),
    ),
    delete: jest.fn(async (_publicId: string) => undefined),
  };

  beforeAll(async () => {
    const externalDatabaseUrl = process.env.E2E_DATABASE_URL;
    if (externalDatabaseUrl) {
      process.env.DATABASE_URL = externalDatabaseUrl;
    } else {
      postgres = await new PostgreSqlContainer('postgres:16-alpine')
        .withDatabase('refugiapp_test')
        .withUsername('refugiapp_test')
        .withPassword('refugiapp_test')
        .start();
      process.env.DATABASE_URL = postgres.getConnectionUri();
    }

    process.env.NODE_ENV = 'test';
    process.env.DB_SSL = 'false';
    process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';
    process.env.DB_POOL_SIZE = '5';
    process.env.TYPEORM_SYNCHRONIZE = 'false';
    process.env.TYPEORM_LOGGING = 'false';
    process.env.JWT_SECRET = 'rfg-45-test-only-secret-with-at-least-32-characters';
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
    await resetDatabase();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (postgres) {
      await postgres.stop();
    }
  });

  it('accepts valid login and returns the same generic 401 for invalid credentials', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);

    const validLogin = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(validLogin.body).toEqual({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: '1h',
    });
    expect(validLogin.body).not.toHaveProperty('passwordHash');

    const invalidPassword = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: 'Wrong-Integration-Password' })
      .expect(401);
    const missingUser = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: 'missing@refugiapp.test', password: TEST_PASSWORD })
      .expect(401);

    expect(invalidPassword.body).toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
      path: `${API_PREFIX}/auth/login`,
    });
    expect(missingUser.body).toMatchObject({
      statusCode: 401,
      code: invalidPassword.body.code,
      message: invalidPassword.body.message,
    });
  });

  it('covers user persistence, validation, 401, 403, deactivation and reactivation', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);

    const unauthorized = await request(app.getHttpServer())
      .get(`${API_PREFIX}/animals`)
      .expect(401);
    expect(unauthorized.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      path: `${API_PREFIX}/animals`,
    });

    const invalidUser = await request(app.getHttpServer())
      .post(`${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'not-an-email', password: 'short', unexpected: true })
      .expect(400);
    expect(invalidUser.body).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      path: `${API_PREFIX}/users`,
    });
    expect(invalidUser.body.message).toEqual(expect.any(Array));

    const managerEmail = 'manager.rfg45@refugiapp.test';
    const createdUser = await createUser(adminToken, managerEmail, [UserRole.SHELTER_MANAGER]);

    expect(createdUser).toMatchObject({
      id: expect.any(String),
      email: managerEmail,
      roles: [UserRole.SHELTER_MANAGER],
    });
    expect(createdUser).not.toHaveProperty('password');
    expect(createdUser).not.toHaveProperty('passwordHash');

    const persistedUser = await database
      .getRepository(UserOrmEntity)
      .findOneByOrFail({ id: createdUser.id });
    expect(persistedUser.passwordHash).not.toBe(TEST_PASSWORD);

    const managerToken = await login(managerEmail);
    const forbidden = await request(app.getHttpServer())
      .post(`${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        email: 'forbidden.rfg45@refugiapp.test',
        password: TEST_PASSWORD,
        firstName: 'Forbidden',
        lastName: 'User',
      })
      .expect(403);
    expect(forbidden.body).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
      path: `${API_PREFIX}/users`,
    });

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/users/${createdUser.id}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    const deactivatedUser = await database.getRepository(UserOrmEntity).findOne({
      where: { id: createdUser.id },
      withDeleted: true,
    });
    expect(deactivatedUser).toMatchObject({ isActive: false });
    expect(deactivatedUser?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: managerEmail, password: TEST_PASSWORD })
      .expect(401);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/users/${createdUser.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: managerEmail, password: TEST_PASSWORD })
      .expect(200);
  });

  it('persists animals and exposes separate general and clinical histories', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const managerEmail = 'animal.manager.rfg45@refugiapp.test';
    await createUser(adminToken, managerEmail, [UserRole.SHELTER_MANAGER]);
    const managerToken = await login(managerEmail);

    const animalResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Luna',
        species: 'dog',
        breed: 'mixed',
        intakeDate: '2025-01-01',
        birthDate: '2023-06-01',
      })
      .expect(201);

    const animalId = animalResponse.body.id as string;
    expect(animalResponse.body).toMatchObject({
      id: expect.any(String),
      name: 'Luna',
      species: 'dog',
      status: AnimalStatus.ADMITTED,
    });
    expect(await database.getRepository(AnimalOrmEntity).countBy({ id: animalId })).toBe(1);
    expect(await database.getRepository(AnimalHistoryEventOrmEntity).countBy({ animalId })).toBe(1);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals/${animalId}/events`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        eventType: AnimalHistoryEventType.GENERAL_NOTE,
        description: 'Adapted well to the new kennel.',
        occurredAt: '2025-01-02T10:00:00.000Z',
      })
      .expect(201);

    const generalHistory = await request(app.getHttpServer())
      .get(`${API_PREFIX}/animals/${animalId}/events`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(generalHistory.body.total).toBe(2);
    expect(generalHistory.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: AnimalHistoryEventType.INTAKE }),
        expect.objectContaining({ eventType: AnimalHistoryEventType.GENERAL_NOTE }),
      ]),
    );

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/medical-records`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        animalId,
        recordType: MedicalRecordType.VACCINATION,
        title: 'Annual vaccine',
        occurredAt: '2025-01-03T10:00:00.000Z',
      })
      .expect(403);

    const medicalRecordResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/medical-records`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId,
        recordType: MedicalRecordType.VACCINATION,
        title: 'Annual vaccine',
        diagnosis: 'Healthy',
        treatment: 'Applied vaccine',
        occurredAt: '2025-01-03T10:00:00.000Z',
      })
      .expect(201);

    expect(
      await database
        .getRepository(MedicalRecordOrmEntity)
        .countBy({ id: medicalRecordResponse.body.id as string, animalId }),
    ).toBe(1);

    const clinicalHistory = await request(app.getHttpServer())
      .get(`${API_PREFIX}/animals/${animalId}/medical-records`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(clinicalHistory.body).toMatchObject({
      total: 1,
      items: [
        expect.objectContaining({
          animalId,
          recordType: MedicalRecordType.VACCINATION,
          title: 'Annual vaccine',
        }),
      ],
    });
  });

  it('persists media metadata and links it transactionally to an expense', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const veterinarianEmail = 'veterinarian.rfg45@refugiapp.test';
    await createUser(adminToken, veterinarianEmail, [UserRole.VETERINARIAN]);
    const veterinarianToken = await login(veterinarianEmail);

    const animalResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Milo', species: 'cat', intakeDate: '2025-02-01' })
      .expect(201);
    const animalId = animalResponse.body.id as string;

    const missingFile = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    expect(missingFile.body).toMatchObject({ code: 'FILE_REQUIRED' });

    const uploadResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('fake-png-content'), {
        filename: 'receipt.png',
        contentType: 'image/png',
      })
      .expect(201);

    const mediaId = uploadResponse.body.id as string;
    expect(uploadResponse.body).toMatchObject({
      id: expect.any(String),
      ownerType: null,
      ownerId: null,
      resourceType: MediaResourceType.IMAGE,
    });

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId,
        category: ExpenseCategory.VETERINARY,
        amountCents: -1,
        currency: 'ARS',
        description: 'Invalid negative expense',
        incurredAt: '2025-02-02T12:00:00.000Z',
      })
      .expect(400);
    expect(await database.getRepository(ExpenseOrmEntity).count()).toBe(0);

    const expenseResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/expenses`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId,
        category: ExpenseCategory.VETERINARY,
        amountCents: 245000,
        currency: 'ARS',
        description: 'Emergency consultation',
        ticketMediaId: mediaId,
        incurredAt: '2025-02-02T12:00:00.000Z',
      })
      .expect(201);

    const expenseId = expenseResponse.body.id as string;
    const storedMedia = await database
      .getRepository(MediaAssetOrmEntity)
      .findOneByOrFail({ id: mediaId });
    expect(storedMedia).toMatchObject({
      ownerType: MediaOwnerType.EXPENSE_TICKET,
      ownerId: expenseId,
    });

    const expenseList = await request(app.getHttpServer())
      .get(`${API_PREFIX}/expenses`)
      .query({ animalId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(expenseList.body).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ id: expenseId, ticketMediaId: mediaId })],
    });

    const mediaList = await request(app.getHttpServer())
      .get(`${API_PREFIX}/media`)
      .query({ ownerType: MediaOwnerType.EXPENSE_TICKET, ownerId: expenseId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(mediaList.body).toMatchObject({
      total: 1,
      items: [expect.objectContaining({ id: mediaId, ownerId: expenseId })],
    });

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${veterinarianToken}`)
      .field('ownerType', MediaOwnerType.EXPENSE_TICKET)
      .field('ownerId', expenseId)
      .attach('file', Buffer.from('second-fake-png'), {
        filename: 'forbidden.png',
        contentType: 'image/png',
      })
      .expect(403);
    expect(cloudinaryStorage.upload).toHaveBeenCalledTimes(1);
  });

  async function resetDatabase(): Promise<void> {
    await database.query(
      `TRUNCATE TABLE
        "medical_record_changes",
        "medical_records",
        "expenses",
        "animal_history_events",
        "animals",
        "veterinarians",
        "media_assets",
        "users"
      RESTART IDENTITY CASCADE`,
    );
  }

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-45',
        lastName: 'Fixture',
        roles,
        isActive: true,
      }),
    );
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function createUser(
    adminToken: string,
    email: string,
    roles: UserRole[],
  ): Promise<{ id: string; email: string; roles: UserRole[] }> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        password: TEST_PASSWORD,
        firstName: 'RFG-45',
        lastName: 'User',
        roles,
      })
      .expect(201);

    return response.body as { id: string; email: string; roles: UserRole[] };
  }
});
