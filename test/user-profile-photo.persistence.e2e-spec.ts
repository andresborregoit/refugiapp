import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IsolatedPostgres, resetDatabase, startIsolatedPostgres, teardownPersistence } from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { AuditForbiddenFilter } from '../src/modules/audit-logs/interfaces/filters/audit-forbidden.filter';
import { AuditLogOrmEntity } from '../src/modules/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.orm-entity';
import { MediaOwnerType } from '../src/modules/media/domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../src/modules/media/domain/enums/media-resource-type.enum';
import {
  CloudinaryStorageService,
  CloudinaryUploadResult,
  UploadFileOptions,
} from '../src/modules/media/infrastructure/cloudinary/cloudinary-storage.service';
import { MediaAssetOrmEntity } from '../src/modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg-ProfilePhoto-Integration-Password';
const ADMIN_EMAIL = 'admin.photo@refugiapp.test';
const MANAGER_EMAIL = 'manager.photo@refugiapp.test';
const VET_EMAIL = 'vet.photo@refugiapp.test';
const API_PREFIX = '/api/v1';

const cloudinaryStorage: jest.Mocked<
  Pick<CloudinaryStorageService, 'buildUploadFolder' | 'upload' | 'delete'>
> = {
  buildUploadFolder: jest.fn((ownerType, ownerId) =>
    ownerType && ownerId ? `refugiapp/${ownerType}/${ownerId}` : 'refugiapp/avatar-orphan',
  ),
  upload: jest.fn(
    async (
      _fileBuffer: Buffer,
      _options: UploadFileOptions,
    ): Promise<CloudinaryUploadResult> => ({
      publicId: `avatar/${randomUUID()}`,
      secureUrl: 'https://example.test/avatar.png',
      format: 'png',
      bytes: 16,
      resourceType: MediaResourceType.IMAGE,
    }),
  ),
  delete: jest.fn(async (_publicId: string) => undefined),
};

describe('User profile photo with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let passwordHash: string;

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-profile-photo-test-only-secret-with-at-least-32-characters';
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
    app.useGlobalFilters(new HttpExceptionFilter(), app.get(AuditForbiddenFilter));
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

  it('persists an orphan upload linked via PATCH /users/:id and exposes it on GET /users/me after re-login', async () => {
    const admin = await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const manager = await createUser(adminToken, MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    const managerToken = await login(MANAGER_EMAIL);

    const mediaId = await uploadOrphan(managerToken);

    const patched = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: mediaId })
      .expect(200);

    expect(patched.body).toMatchObject({ id: manager.id, profilePhotoMediaId: mediaId });
    expect(patched.body).not.toHaveProperty('passwordHash');

    const me = await request(app.getHttpServer())
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(me.body.profilePhotoMediaId).toBe(mediaId);

    const stored = await database.getRepository(MediaAssetOrmEntity).findOneByOrFail({ id: mediaId });
    expect(stored).toMatchObject({ ownerType: MediaOwnerType.USER, ownerId: manager.id });

    const reloggedToken = await login(MANAGER_EMAIL);
    const meAfterRelogin = await request(app.getHttpServer())
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${reloggedToken}`)
      .expect(200);
    expect(meAfterRelogin.body.profilePhotoMediaId).toBe(mediaId);
    expect(admin.id).toBeDefined();
  });

  it('orphans the previous asset on replacement and clears the photo with and explicit null', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const manager = await createUser(adminToken, MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    const managerToken = await login(MANAGER_EMAIL);

    const first = await uploadOrphan(managerToken);
    const second = await uploadOrphan(managerToken);

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: first })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: second })
      .expect(200);

    expect(await assetOf(first)).toMatchObject({ ownerType: null, ownerId: null });
    expect(await assetOf(second)).toMatchObject({
      ownerType: MediaOwnerType.USER,
      ownerId: manager.id,
    });

    const cleared = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: null })
      .expect(200);

    expect(cleared.body).toMatchObject({ id: manager.id, profilePhotoMediaId: null });
    expect(await assetOf(second)).toMatchObject({ ownerType: null, ownerId: null });

    const me = await request(app.getHttpServer())
      .get(`${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(me.body).toHaveProperty('profilePhotoMediaId', null);
  });

  it('returns 404 for a missing asset and 409 for incompatible or already owned assets', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const manager = await createUser(adminToken, MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    const managerToken = await login(MANAGER_EMAIL);

    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: randomUUID() })
      .expect(404);

    const animalAvatar = await uploadOrphan(adminToken);
    await request(app.getHttpServer())
      .post(`${API_PREFIX}/animals`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Luna', species: 'dog', intakeDate: '2025-01-01', profilePhotoMediaId: animalAvatar })
      .expect(201);

    const incompatible = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profilePhotoMediaId: animalAvatar })
      .expect(409);
    expect(incompatible.body.code).toBe('INCOMPATIBLE_OWNER_TYPE');

    const vet = await createUser(adminToken, VET_EMAIL, [UserRole.VETERINARIAN]);
    const vetAvatar = await uploadOrphan(adminToken);
    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${vet.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profilePhotoMediaId: vetAvatar })
      .expect(200);

    const alreadyOwned = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profilePhotoMediaId: vetAvatar })
      .expect(409);
    expect(alreadyOwned.body.code).toBe('MEDIA_ALREADY_OWNED');
  });

  it('rejects a non-admin editing another user with 403 and audits access.denied', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const manager = await createUser(adminToken, MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    const vet = await createUser(adminToken, VET_EMAIL, [UserRole.VETERINARIAN]);
    const managerToken = await login(MANAGER_EMAIL);

    const forbidden = await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${vet.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: randomUUID() })
      .expect(403);
    expect(forbidden.body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN_RESOURCE' });

    const denials = await database.getRepository(AuditLogOrmEntity).find({
      where: { action: 'access.denied' as never, actorUserId: manager.id as never },
    });
    expect(denials.length).toBeGreaterThan(0);
  });

  it('returns 401 without a token on PATCH /users/:id', async () => {
    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${randomUUID()}`)
      .send({ profilePhotoMediaId: randomUUID() })
      .expect(401);
  });

  it('lets the owner and admin read/delete user avatars but forbids others', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const manager = await createUser(adminToken, MANAGER_EMAIL, [UserRole.SHELTER_MANAGER]);
    const vet = await createUser(adminToken, VET_EMAIL, [UserRole.VETERINARIAN]);
    const managerToken = await login(MANAGER_EMAIL);
    const vetToken = await login(VET_EMAIL);

    const avatar = await uploadOrphan(managerToken);
    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${manager.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ profilePhotoMediaId: avatar })
      .expect(200);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const forbiddenRead = await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(403);
    expect(forbiddenRead.body.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const forbiddenDelete = await request(app.getHttpServer())
      .delete(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(403);
    expect(forbiddenDelete.body.code).toBe('FORBIDDEN');

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${avatar}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    const vetAvatar = await uploadOrphan(vetToken);
    await request(app.getHttpServer())
      .patch(`${API_PREFIX}/users/${vet.id}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .send({ profilePhotoMediaId: vetAvatar })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/media/${vetAvatar}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
  });

  it('allows a user to upload a user-owned asset only for themselves', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    const vet = await createUser(adminToken, VET_EMAIL, [UserRole.VETERINARIAN]);
    const vetToken = await login(VET_EMAIL);

    const own = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${vetToken}`)
      .field('ownerType', MediaOwnerType.USER)
      .field('ownerId', vet.id)
      .attach('file', Buffer.from('avatar-png'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(own.body).toMatchObject({ ownerType: MediaOwnerType.USER, ownerId: vet.id });

    await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${vetToken}`)
      .field('ownerType', MediaOwnerType.USER)
      .field('ownerId', randomUUID())
      .attach('file', Buffer.from('avatar-png'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(403);
  });

  async function assetOf(id: string): Promise<MediaAssetOrmEntity> {
    return database.getRepository(MediaAssetOrmEntity).findOneByOrFail({ id });
  }

  async function uploadOrphan(token: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('orphan-png'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    return response.body.id as string;
  }

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'Photo',
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
        firstName: 'Photo',
        lastName: 'User',
        roles,
      })
      .expect(201);

    return response.body as { id: string; email: string; roles: UserRole[] };
  }
});