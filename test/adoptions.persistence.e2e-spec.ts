import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { hashPassword } from '../src/common/security/password-hasher';
import { AdoptionApplicationStatus } from '../src/modules/adoptions/domain/enums/adoption-application-status.enum';
import { AdoptionApplicationOrmEntity } from '../src/modules/adoptions/infrastructure/persistence/typeorm/entities/adoption-application.orm-entity';
import { AdoptionOrmEntity } from '../src/modules/adoptions/infrastructure/persistence/typeorm/entities/adoption.orm-entity';
import { AnimalHistoryEventType } from '../src/modules/animals/domain/enums/animal-history-event-type.enum';
import { AnimalSex } from '../src/modules/animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { AnimalHistoryEventOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import {
  IsolatedPostgres,
  resetDatabase,
  startIsolatedPostgres,
  teardownPersistence,
} from './utils/persistence-test-setup';

const API_PREFIX = '/api/v1';
const TEST_PASSWORD = 'Rfg95-Integration-Password';

describe('Adoption process with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();
    process.env.JWT_SECRET = 'rfg-95-test-only-secret-with-at-least-32-characters';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_ISSUER = 'refugiapp-api-test';
    process.env.JWT_AUDIENCE = 'refugiapp-test-client';
    process.env.CLOUDINARY_CLOUD_NAME = '';
    process.env.CLOUDINARY_API_KEY = '';
    process.env.CLOUDINARY_API_SECRET = '';

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    database = moduleRef.get(DataSource);
    await database.runMigrations({ transaction: 'each' });

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    passwordHash = await hashPassword(TEST_PASSWORD);
  });

  beforeEach(async () => resetDatabase(database));

  afterAll(async () => teardownPersistence({ dataSource: database, app, isolated }));

  it('creates an adopter and application, then completes adoption with status event', async () => {
    const admin = await seedUser('admin.rfg95@refugiapp.test', UserRole.ADMIN);
    const animal = await seedAnimal(AnimalStatus.AVAILABLE_FOR_ADOPTION);
    const token = await login(admin.email);

    const adopterResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/adopters`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'ANA.RFG95@EXAMPLE.COM',
        phone: '+5491123456789',
        address: 'Calle 123',
      })
      .expect(201);

    expect(adopterResponse.body).toMatchObject({
      email: 'ana.rfg95@example.com',
      phone: '+5491123456789',
    });

    const applicationResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals/${animal.id}/adoption-applications`)
      .set('Authorization', `Bearer ${token}`)
      .send({ adopterId: adopterResponse.body.id })
      .expect(201);
    expect(applicationResponse.body.status).toBe(AdoptionApplicationStatus.PENDING);

    const adoptionResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/adoption-applications/${applicationResponse.body.id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(adoptionResponse.body).toMatchObject({
      animalId: animal.id,
      adopterId: adopterResponse.body.id,
      applicationId: applicationResponse.body.id,
      responsibleUserId: admin.id,
    });

    const persistedAnimal = await database.getRepository(AnimalOrmEntity).findOneByOrFail({
      id: animal.id,
    });
    const persistedApplication = await database
      .getRepository(AdoptionApplicationOrmEntity)
      .findOneByOrFail({ id: applicationResponse.body.id });
    const persistedAdoption = await database.getRepository(AdoptionOrmEntity).findOneByOrFail({
      id: adoptionResponse.body.id,
    });
    const statusEvent = await database.getRepository(AnimalHistoryEventOrmEntity).findOneByOrFail({
      animalId: animal.id,
      eventType: AnimalHistoryEventType.STATUS_CHANGE,
    });

    expect(persistedAnimal.status).toBe(AnimalStatus.ADOPTED);
    expect(persistedApplication.status).toBe(AdoptionApplicationStatus.APPROVED);
    expect(persistedAdoption.responsibleUserId).toBe(admin.id);
    expect(statusEvent.metadata).toMatchObject({
      from: AnimalStatus.AVAILABLE_FOR_ADOPTION,
      to: AnimalStatus.ADOPTED,
      adoptionId: persistedAdoption.id,
    });

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/animals/${animal.id}/adoptions`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => expect(body.items).toHaveLength(1));
  });

  it('validates contact data and role permissions', async () => {
    const admin = await seedUser('admin.validation.rfg95@refugiapp.test', UserRole.ADMIN);
    const veterinarian = await seedUser('vet.rfg95@refugiapp.test', UserRole.VETERINARIAN);
    const adminToken = await login(admin.email);
    const veterinarianToken = await login(veterinarian.email);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/adopters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'invalid-email',
        phone: '123',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/adopters`)
      .set('Authorization', `Bearer ${veterinarianToken}`)
      .send({
        firstName: 'Ana',
        lastName: 'Perez',
        email: 'ana@example.com',
        phone: '+5491123456789',
      })
      .expect(403);
  });

  async function seedUser(email: string, role: UserRole): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);
    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-95',
        lastName: 'Fixture',
        roles: [role],
        isActive: true,
      }),
    );
  }

  async function seedAnimal(status: AnimalStatus): Promise<AnimalOrmEntity> {
    const repository = database.getRepository(AnimalOrmEntity);
    return repository.save(
      repository.create({
        name: 'Luna',
        species: 'dog',
        sex: AnimalSex.FEMALE,
        status,
        intakeDate: '2026-01-01',
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
});
