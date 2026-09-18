import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IsolatedPostgres, resetDatabase, startIsolatedPostgres } from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { RefreshTokenOrmEntity } from '../src/modules/auth/infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';
import { hashRefreshToken } from '../src/modules/auth/infrastructure/security/refresh-token-generator';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg52-Refresh-Password';
const ADMIN_EMAIL = 'admin.refresh@refugiapp.test';
const API_PREFIX = '/api/v1';
const REUSE_GRACE_MS = 30 * 1000;

describe('Refresh token rotation with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-52-test-only-secret-with-at-least-32-characters';
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
    await resetDatabase(database);

    if (app) {
      await app.close();
    }

    await isolated.stop();
  });

  it('issues a refresh token on login and rotates it into a fresh pair', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);

    const loginResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const firstAccessToken = loginResponse.body.accessToken as string;
    const firstRefreshToken = loginResponse.body.refreshToken as string;
    expect(firstRefreshToken).toEqual(expect.any(String));
    expect(firstRefreshToken).not.toBe(firstAccessToken);
    expect(loginResponse.body).not.toHaveProperty('passwordHash');

    const rotated = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: firstRefreshToken })
      .expect(200);

    expect(rotated.body.accessToken).toEqual(expect.any(String));
    expect(rotated.body.refreshToken).toEqual(expect.any(String));
    expect(rotated.body.refreshToken).not.toBe(firstRefreshToken);

    const stored = await database.getRepository(RefreshTokenOrmEntity).find();
    expect(stored).toHaveLength(2);
    expect(stored.filter((row) => row.revokedAt)).toHaveLength(1);
    expect(stored.filter((row) => !row.revokedAt)).toHaveLength(1);
    expect(stored.map((row) => row.familyId)).toEqual([stored[0]!.familyId, stored[0]!.familyId]);
    expect(stored.find((row) => !row.revokedAt)?.replacedById).toBe(
      stored.find((row) => row.revokedAt)?.id,
    );
  });

  it('rejects unknown, malformed and expired refresh tokens with 401', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);

    const unknown = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: 'not-a-real-refresh-token' })
      .expect(401);
    expect(unknown.body).toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
      path: `${API_PREFIX}/auth/refresh`,
    });

    const loginResponse = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      .expect(200);
    const refreshToken = loginResponse.body.refreshToken as string;

    await database.getRepository(RefreshTokenOrmEntity).update(
      { tokenHash: hashRefreshToken(refreshToken) },
      { expiresAt: new Date(Date.now() - 1000) },
    );

    const expired = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken })
      .expect(401);
    expect(expired.body).toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' });

    const invalidBody = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: '' })
      .expect(400);
    expect(invalidBody.body).toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects reuse of a rotated token and revokes the whole family', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const loginResponse = await login();
    const firstRefreshToken = loginResponse.body.refreshToken as string;

    const rotated = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: firstRefreshToken })
      .expect(200);
    const secondRefreshToken = rotated.body.refreshToken as string;

    await database
      .getRepository(RefreshTokenOrmEntity)
      .update(
        { tokenHash: hashRefreshToken(firstRefreshToken) },
        { revokedAt: new Date(Date.now() - REUSE_GRACE_MS - 1000) },
      );

    const reused = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
    expect(reused.body).toMatchObject({ code: 'REFRESH_REUSE_DETECTED' });

    const familyRevoked = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: secondRefreshToken })
      .expect(401);
    expect(familyRevoked.body).toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_CONCURRENT_USE',
    });
  });

  it('two simultaneous refreshes with the same token result in one valid token', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const loginResponse = await login();
    const refreshToken = loginResponse.body.refreshToken as string;

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken }),
      request(app.getHttpServer())
        .post(`${API_PREFIX}/auth/refresh`)
        .send({ refreshToken }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 401]);

    const winner = first.status === 200 ? first : second;
    const loser = first.status === 200 ? second : first;
    expect(winner.body.refreshToken).toEqual(expect.any(String));
    expect(winner.body.refreshToken).not.toBe(refreshToken);
    expect(loser.body).toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_CONCURRENT_USE',
    });

    const stored = await database.getRepository(RefreshTokenOrmEntity).find();
    expect(stored).toHaveLength(2);
    expect(stored.filter((row) => !row.revokedAt)).toHaveLength(1);

    const onlyValidToken = winner.body.refreshToken as string;
    const reused = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken: onlyValidToken })
      .expect(200);
    expect(reused.body.refreshToken).toEqual(expect.any(String));
    expect(reused.body.refreshToken).not.toBe(onlyValidToken);
  });

  it('rejects refresh for a deactivated user', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const loginResponse = await login();
    const refreshToken = loginResponse.body.refreshToken as string;

    await database
      .getRepository(UserOrmEntity)
      .update({ email: ADMIN_EMAIL }, { isActive: false });

    const deactivated = await request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/refresh`)
      .send({ refreshToken })
      .expect(401);
    expect(deactivated.body).toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
  });

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'RFG-52',
        lastName: 'Fixture',
        roles,
        isActive: true,
      }),
    );
  }

  async function login(): Promise<request.Response> {
    return request(app.getHttpServer())
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      .expect(200);
  }
});