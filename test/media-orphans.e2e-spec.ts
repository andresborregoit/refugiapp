import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { IsolatedPostgres, resetDatabase, startIsolatedPostgres, teardownPersistence } from './utils/persistence-test-setup';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { UserRole } from '../src/common/enums/user-role.enum';
import { hashPassword } from '../src/common/security/password-hasher';
import { MediaService } from '../src/modules/media/application/services/media.service';
import { MediaResourceType } from '../src/modules/media/domain/enums/media-resource-type.enum';
import {
  CloudinaryStorageService,
  CloudinaryUploadResult,
  UploadFileOptions,
} from '../src/modules/media/infrastructure/cloudinary/cloudinary-storage.service';
import { MediaAssetOrmEntity } from '../src/modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

const TEST_PASSWORD = 'Rfg-Orphan-Integration-Password';
const ADMIN_EMAIL = 'admin.orphan@refugiapp.test';
const VET_OWNER_EMAIL = 'vet.owner.orphan@refugiapp.test';
const VET_OTHER_EMAIL = 'vet.other.orphan@refugiapp.test';
const API_PREFIX = '/api/v1';

describe('Orphan media policy with PostgreSQL persistence (e2e)', () => {
  let app: INestApplication;
  let database: DataSource;
  let isolated: IsolatedPostgres;
  let mediaService: MediaService;
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
        publicId: `orphan/${randomUUID()}`,
        secureUrl: 'https://example.test/orphan/asset.png',
        format: 'png',
        bytes: 16,
        resourceType: MediaResourceType.IMAGE,
      }),
    ),
    delete: jest.fn(async (_publicId: string) => undefined),
  };

  beforeAll(async () => {
    isolated = await startIsolatedPostgres();

    process.env.JWT_SECRET = 'rfg-orphan-test-only-secret-with-at-least-32-characters';
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

    mediaService = moduleRef.get(MediaService);

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

  it('lets the uploader delete their own orphan asset after cancelling', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    await createUser(adminToken, VET_OWNER_EMAIL, [UserRole.VETERINARIAN]);
    const vetToken = await login(VET_OWNER_EMAIL);

    const upload = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${vetToken}`)
      .attach('file', Buffer.from('orphan-png'), {
        filename: 'orphan.png',
        contentType: 'image/png',
      })
      .expect(201);

    const mediaId = upload.body.id as string;
    expect(upload.body).toMatchObject({ ownerType: null, ownerId: null });

    await request(app.getHttpServer())
      .delete(`${API_PREFIX}/media/${mediaId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${mediaId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(404);

    expect(cloudinaryStorage.delete).toHaveBeenCalledWith(upload.body.publicId);
  });

  it('forbids a veterinarian from deleting a foreign orphan asset', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    await createUser(adminToken, VET_OWNER_EMAIL, [UserRole.VETERINARIAN]);
    await createUser(adminToken, VET_OTHER_EMAIL, [UserRole.VETERINARIAN]);
    const ownerToken = await login(VET_OWNER_EMAIL);
    const otherToken = await login(VET_OTHER_EMAIL);

    const upload = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('orphan-png'), {
        filename: 'orphan.png',
        contentType: 'image/png',
      })
      .expect(201);

    const mediaId = upload.body.id as string;

    const forbidden = await request(app.getHttpServer())
      .delete(`${API_PREFIX}/media/${mediaId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    expect(forbidden.body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });

    const stillThere = await database
      .getRepository(MediaAssetOrmEntity)
      .findOneByOrFail({ id: mediaId });
    expect(stillThere.deletedAt).toBeNull();
    expect(cloudinaryStorage.delete).not.toHaveBeenCalled();
  });

  it('runs the orphan cleanup job with dry-run and real execution', async () => {
    await seedUser(ADMIN_EMAIL, [UserRole.ADMIN]);
    const adminToken = await login(ADMIN_EMAIL);
    await createUser(adminToken, VET_OWNER_EMAIL, [UserRole.VETERINARIAN]);
    const vetToken = await login(VET_OWNER_EMAIL);

    const expiredUpload = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${vetToken}`)
      .attach('file', Buffer.from('expired-png'), {
        filename: 'expired.png',
        contentType: 'image/png',
      })
      .expect(201);
    const recentUpload = await request(app.getHttpServer())
      .post(`${API_PREFIX}/media/upload`)
      .set('Authorization', `Bearer ${vetToken}`)
      .attach('file', Buffer.from('recent-png'), {
        filename: 'recent.png',
        contentType: 'image/png',
      })
      .expect(201);

    const expiredId = expiredUpload.body.id as string;
    const recentId = recentUpload.body.id as string;
    const expiredPublicId = expiredUpload.body.publicId as string;

    await database
      .getRepository(MediaAssetOrmEntity)
      .update({ id: expiredId }, { createdAt: new Date(Date.now() - 100 * 60 * 60 * 1000) });

    const dryRun = await mediaService.purgeExpiredOrphans({
      olderThanHours: 48,
      dryRun: true,
    });

    expect(dryRun.candidates).toEqual([expiredId]);
    expect(dryRun).toMatchObject({ dryRun: true, deleted: 0, failed: 0 });
    expect(cloudinaryStorage.delete).not.toHaveBeenCalled();

    const expiredBeforeRun = await database
      .getRepository(MediaAssetOrmEntity)
      .findOneByOrFail({ id: expiredId });
    expect(expiredBeforeRun.deletedAt).toBeNull();

    const realRun = await mediaService.purgeExpiredOrphans({
      olderThanHours: 48,
      dryRun: false,
    });

    expect(realRun).toMatchObject({ dryRun: false, deleted: 1, failed: 0 });
    expect(cloudinaryStorage.delete).toHaveBeenCalledWith(expiredPublicId);

    const expiredAfterRun = await database
      .getRepository(MediaAssetOrmEntity)
      .findOne({ where: { id: expiredId }, withDeleted: true });
    expect(expiredAfterRun?.deletedAt).toBeInstanceOf(Date);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${expiredId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`${API_PREFIX}/media/${recentId}`)
      .set('Authorization', `Bearer ${vetToken}`)
      .expect(200);
  });

  async function seedUser(email: string, roles: UserRole[]): Promise<UserOrmEntity> {
    const repository = database.getRepository(UserOrmEntity);

    return repository.save(
      repository.create({
        email,
        passwordHash,
        firstName: 'Orphan',
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
        firstName: 'Orphan',
        lastName: 'User',
        roles,
      })
      .expect(201);

    return response.body as { id: string; email: string; roles: UserRole[] };
  }
});