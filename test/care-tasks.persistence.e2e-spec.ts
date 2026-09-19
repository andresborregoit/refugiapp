import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IsolatedPostgres, resetDatabase, startIsolatedPostgres, teardownPersistence } from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { CareTaskStatus } from '../src/modules/care-tasks/domain/enums/care-task-status.enum';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { CareTaskOrmEntity } from '../src/modules/care-tasks/infrastructure/persistence/typeorm/entities/care-task.orm-entity';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg51-CareTasks-Password';
const API_PREFIX = '/api/v1';
const ADMIN_EMAIL = 'admin.caretasks@refugiapp.test';
const MANAGER_EMAIL = 'manager.caretasks@refugiapp.test';
const VETERINARIAN_EMAIL = 'veterinarian.caretasks@refugiapp.test';

describe('Care tasks with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-51-test-only-secret-with-at-least-32-characters';
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
    await teardownPersistence({ dataSource: database, app, isolated });
  });

  it('returns 401 without a token and rejects veterinarian writes with 403', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    await seedUser(MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    await seedUser(VETERINARIAN_EMAIL, [UserRole.VETERINARIAN]);
    const adminToken = await login(ADMIN_EMAIL);
    const veterinarianToken = await login(VETERINARIAN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const unauthorized = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks`)
      .expect(401);
    expect(unauthorized.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      path: `${API_PREFIX}/care-tasks`,
    });

    const payload = { animalId, title: 'Daily feeding' };

    for (const action of [
      () =>
        request(app.getHttpServer())
          .post(`${API_PREFIX}/care-tasks`)
          .set('Authorization', `Bearer ${veterinarianToken}`)
          .send(payload),
      () =>
        request(app.getHttpServer())
          .patch(`${API_PREFIX}/care-tasks/${randomUUID()}`)
          .set('Authorization', `Bearer ${veterinarianToken}`)
          .send({ title: 'Updated' }),
      () =>
        request(app.getHttpServer())
          .post(`${API_PREFIX}/care-tasks/${randomUUID()}/complete`)
          .set('Authorization', `Bearer ${veterinarianToken}`),
      () =>
        request(app.getHttpServer())
          .post(`${API_PREFIX}/care-tasks/${randomUUID()}/cancel`)
          .set('Authorization', `Bearer ${veterinarianToken}`),
    ]) {
      const response = await action();
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
    }

    expect(
      await request(app.getHttpServer())
        .get(`${API_PREFIX}/care-tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200),
    ).toBeDefined();
  });

  it('creates a pending care task, persists the actor and records an audit event', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const missingAnimal = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ animalId: randomUUID(), title: 'Orphan task' })
      .expect(404);
    expect(missingAnimal.body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' });

    const created = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        animalId,
        title: '  Daily feeding  ',
        description: '  Two portions  ',
        dueAt: '2026-02-01T10:00:00.000Z',
      })
      .expect(201);

    const taskId = created.body.id as string;
    expect(created.body).toMatchObject({
      id: expect.any(String),
      animalId,
      title: 'Daily feeding',
      description: 'Two portions',
      status: CareTaskStatus.PENDING,
      completedAt: null,
      createdByUserId: expect.any(String),
    });
    expect(created.body.dueAt).toBe('2026-02-01T10:00:00.000Z');
    expect(created.body).not.toHaveProperty('passwordHash');

    const persisted = await database.getRepository(CareTaskOrmEntity).findOneByOrFail({ id: taskId });
    expect(persisted).toMatchObject({
      animalId,
      title: 'Daily feeding',
      description: 'Two portions',
      status: CareTaskStatus.PENDING,
    });

    const audit = await database.query(
      `SELECT "action", "resourceType", "resourceId", "actorUserId" FROM "audit_logs" WHERE "action" = 'care_task.create'`,
    );
    expect(audit).toEqual([
      expect.objectContaining({ resourceId: taskId, actorUserId: expect.any(String) }),
    ]);
  });

  it('lists care tasks with filters, pagination and a deterministic order', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const animalId = await seedAnimal('Luna');

    for (let index = 0; index < 3; index += 1) {
      await createTask(adminToken, animalId, `Task ${index}`);
    }

    const all = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 2, page: 2 })
      .expect(200);
    expect(all.body).toMatchObject({ page: 2, limit: 2, total: 3 });
    expect(all.body.items).toHaveLength(1);

    const byAnimal = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ animalId })
      .expect(200);
    expect(byAnimal.body.total).toBe(3);
    expect(byAnimal.body.items.map((t: { animalId: string }) => t.animalId)).toEqual([
      animalId,
      animalId,
      animalId,
    ]);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ animalId: randomUUID() })
      .expect(404);

    const completedId = await completeTask(adminToken, byAnimal.body.items[0].id as string);
    const byStatus = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: CareTaskStatus.COMPLETED })
      .expect(200);
    expect(byStatus.body.total).toBe(1);
    expect(byStatus.body.items[0].id).toBe(completedId);
  });

  it('returns a care task by id and 404 for unknown ids', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const created = await createTask(adminToken, animalId, 'Check water');
    const found = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks/${created}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(found.body).toMatchObject({ id: created, title: 'Check water' });

    const missing = await request(app.getHttpServer())
      .get(`${API_PREFIX}/care-tasks/${randomUUID()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
    expect(missing.body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('applies partial updates and clears nullable fields with explicit null', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const taskId = await createTask(adminToken, animalId, 'Walk the dog');

    const titleOnly = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/care-tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Walk and play' })
      .expect(200);
    expect(titleOnly.body).toMatchObject({
      id: taskId,
      title: 'Walk and play',
      status: CareTaskStatus.PENDING,
    });

    const clearAll = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/care-tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: null, dueAt: null })
      .expect(200);
    expect(clearAll.body).toMatchObject({ description: null, dueAt: null });

    const invalid = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/care-tasks/${taskId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'x' })
      .expect(400);
    expect(invalid.body).toMatchObject({ code: 'BAD_REQUEST' });

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/care-tasks/${randomUUID()}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Missing task' })
      .expect(404);
  });

  it('completes and cancels pending tasks and rejects transitions from terminal states', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const completedId = await createTask(adminToken, animalId, 'Medication');
    const completed = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${completedId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(completed.body).toMatchObject({
      id: completedId,
      status: CareTaskStatus.COMPLETED,
    });
    expect(completed.body.completedAt).toEqual(expect.any(String));

    const persistedCompleted = await database
      .getRepository(CareTaskOrmEntity)
      .findOneByOrFail({ id: completedId });
    expect(persistedCompleted.status).toBe(CareTaskStatus.COMPLETED);
    expect(persistedCompleted.completedAt).toBeInstanceOf(Date);

    const doubleComplete = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${completedId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(doubleComplete.body).toMatchObject({ code: 'CARE_TASK_NOT_PENDING' });

    const cancelCompleted = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${completedId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(cancelCompleted.body).toMatchObject({ code: 'CARE_TASK_NOT_PENDING' });

    const cancelledId = await createTask(adminToken, animalId, 'Grooming');
    const cancelled = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${cancelledId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cancelled.body).toMatchObject({
      id: cancelledId,
      status: CareTaskStatus.CANCELLED,
    });

    const doubleCancel = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${cancelledId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(doubleCancel.body).toMatchObject({ code: 'CARE_TASK_NOT_PENDING' });

    const completeCancelled = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${cancelledId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);
    expect(completeCancelled.body).toMatchObject({ code: 'CARE_TASK_NOT_PENDING' });

    const audit = await database.query(
      `SELECT "action" FROM "audit_logs" WHERE "action"::text LIKE 'care_task.%' ORDER BY "action"::text`,
    );
    expect(audit.map((row: { action: string }) => row.action)).toEqual([
      'care_task.cancel',
      'care_task.complete',
      'care_task.create',
      'care_task.create',
    ]);
  });

  it('allows all authenticated roles to read care tasks', async () => {
    await seedUser(MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    await seedUser(VETERINARIAN_EMAIL, [UserRole.VETERINARIAN]);
    const managerToken = await login(MANAGER_EMAIL);
    const veterinarianToken = await login(VETERINARIAN_EMAIL);
    const animalId = await seedAnimal('Luna');

    const taskId = await createTask(managerToken, animalId, 'Daily check');

    for (const token of [managerToken, veterinarianToken]) {
      const list = await request(app.getHttpServer())
        .get(`${API_PREFIX}/care-tasks`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(list.body.total).toBe(1);

      const detail = await request(app.getHttpServer())
        .get(`${API_PREFIX}/care-tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(detail.body.id).toBe(taskId);
    }
  });

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-51',
        lastName: 'Fixture',
        roles,
        isActive: true,
      }),
    );
  }

  async function seedAnimal(name: string): Promise<string> {
    const repository = database.getRepository(AnimalOrmEntity);
    const entity = await repository.save(
      repository.create({
        id: randomUUID(),
        name,
        species: 'dog',
        status: AnimalStatus.ADMITTED,
        intakeDate: '2026-01-01',
      }),
    );

    return entity.id;
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function createTask(token: string, animalId: string, title: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ animalId, title })
      .expect(201);

    return response.body.id as string;
  }

  async function completeTask(token: string, taskId: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/care-tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return response.body.id as string;
  }
});