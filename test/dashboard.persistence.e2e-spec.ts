import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IsolatedPostgres, resetDatabase, startIsolatedPostgres } from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { correlationIdMiddleware } from '../src/common/middleware/correlation-id.middleware';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { DASHBOARD_RECENT_ANIMALS_LIMIT } from '../src/modules/dashboard/domain/repositories/dashboard.repository';

const TEST_PASSWORD = 'Rfg50-Dashboard-Password';
const API_PREFIX = '/api/v1';

describe('Dashboard overview with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-50-test-only-secret-with-at-least-32-characters';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_ISSUER = 'refugiapp-api-test';
    process.env.JWT_AUDIENCE = 'refugiapp-test-client';
    process.env.CLOUDINARY_CLOUD_NAME = '';
    process.env.CLOUDINARY_API_KEY = '';
    process.env.CLOUDINARY_API_SECRET = '';

    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    database = moduleRef.get(DataSource);
    await database.runMigrations({ transaction: 'each' });

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.use(correlationIdMiddleware);
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
    await resetDatabase(database);
  });

  afterAll(async () => {
    await resetDatabase(database);

    if (app) {
      await app.close();
    }

    await isolated.stop();
  });

  it('returns totals, zero-filled byStatus and recent animals to every authenticated role', async () => {
    await seedUser('admin.rfg50@refugiapp.test', [UserRole.ADMIN]);
    await seedUser('manager.rfg50@refugiapp.test', [UserRole.SHELTER_MANAGER]);
    await seedUser('veterinarian.rfg50@refugiapp.test', [UserRole.VETERINARIAN]);

    const adminToken = await login('admin.rfg50@refugiapp.test');
    const managerToken = await login('manager.rfg50@refugiapp.test');
    const veterinarianToken = await login('veterinarian.rfg50@refugiapp.test');

    const ids = [
      await seedAnimal('Luna', AnimalStatus.ADMITTED),
      await seedAnimal('Rocky', AnimalStatus.ADMITTED),
      await seedAnimal('Milo', AnimalStatus.UNDER_TREATMENT),
      await seedAnimal('Kiwi', AnimalStatus.AVAILABLE_FOR_ADOPTION),
      await seedAnimal('Nala', AnimalStatus.ADOPTED),
      await seedAnimal('Bruno', AnimalStatus.DECEASED),
    ];
    await setDeterministicCreationOrder(ids);

    for (const token of [adminToken, managerToken, veterinarianToken]) {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/dashboard/overview`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.totals.animals).toBe(6);
      expect(res.body.totals.byStatus).toEqual({
        [AnimalStatus.ADMITTED]: 2,
        [AnimalStatus.UNDER_TREATMENT]: 1,
        [AnimalStatus.AVAILABLE_FOR_ADOPTION]: 1,
        [AnimalStatus.ADOPTED]: 1,
        [AnimalStatus.DECEASED]: 1,
      });
      expect(res.body.recentAnimals).toHaveLength(DASHBOARD_RECENT_ANIMALS_LIMIT);
      expect(res.body.recentAnimals.map((a: { id: string }) => a.id)).toEqual(
        ids.slice(1).reverse(),
      );
      expect(res.body.recentAnimals[0]).toHaveProperty('profilePhotoMediaId');
      expect(res.body.recentAnimals[0].profilePhotoMediaId).toBeNull();
      expect(res.body).not.toHaveProperty('passwordHash');
    }
  });

  it('excludes soft-deleted animals from totals and recent list', async () => {
    await seedUser('admin.rfg50@refugiapp.test', [UserRole.ADMIN]);
    const adminToken = await login('admin.rfg50@refugiapp.test');

    const activeId = await seedAnimal('Luna', AnimalStatus.ADMITTED);
    const deletedId = await seedAnimal('Ghost', AnimalStatus.ADMITTED);
    await database.getRepository(AnimalOrmEntity).softDelete({ id: deletedId });

    const res = await request(app.getHttpServer())
      .get(`${API_PREFIX}/dashboard/overview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.totals.animals).toBe(1);
    expect(res.body.totals.byStatus[AnimalStatus.ADMITTED]).toBe(1);
    expect(res.body.recentAnimals).toEqual([
      expect.objectContaining({ id: activeId, name: 'Luna' }),
    ]);
    expect(res.body.recentAnimals).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: deletedId })]),
    );
  });

  it('returns 401 without a token and propagates the correlation id', async () => {
    await seedUser('admin.rfg50@refugiapp.test', [UserRole.ADMIN]);
    const adminToken = await login('admin.rfg50@refugiapp.test');

    const unauthorized = await request(app.getHttpServer())
      .get(`${API_PREFIX}/dashboard/overview`)
      .expect(401);
    expect(unauthorized.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      path: `${API_PREFIX}/dashboard/overview`,
    });

    const res = await request(app.getHttpServer())
      .get(`${API_PREFIX}/dashboard/overview`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-request-id', 'dashboard-persistence-request-id')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('dashboard-persistence-request-id');
  });

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-50',
        lastName: 'Fixture',
        roles,
        isActive: true,
      }),
    );
  }

  async function seedAnimal(name: string, status: AnimalStatus): Promise<string> {
    const repository = database.getRepository(AnimalOrmEntity);
    const entity = await repository.save(
      repository.create({
        id: randomUUID(),
        name,
        species: 'dog',
        status,
        intakeDate: '2026-01-01',
      }),
    );

    return entity.id;
  }

  async function setDeterministicCreationOrder(ids: string[]): Promise<void> {
    const base = Date.UTC(2026, 0, 1, 0, 0, 0);

    for (let index = 0; index < ids.length; index += 1) {
      await database.query(
        `UPDATE "animals" SET "createdAt" = $1::timestamptz WHERE "id" = $2`,
        [new Date(base + index * 1000), ids[index]],
      );
    }
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    return response.body.accessToken as string;
  }
});