import { ConflictException, INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { UsersController } from '../src/modules/users/interfaces/controllers/users.controller';
import { UsersService } from '../src/modules/users/application/services/users.service';
import { User } from '../src/modules/users/domain/entities/user.entity';

const adminPayload = { sub: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const managerPayload = { sub: 'manager-id', email: 'manager@refugiapp.local', roles: [UserRole.SHELTER_MANAGER] };
const veterinarianPayload = {
  sub: 'veterinarian-id',
  email: 'veterinarian@refugiapp.local',
  roles: [UserRole.VETERINARIAN],
};
const VALID_UUID = '11111111-1111-1111-1111-111111111111';

describe('Users (e2e)', () => {
  const mockUsersService = {
    createUser: jest.fn(),
    deactivateUser: jest.fn(),
    activateUser: jest.fn(),
    getProfile: jest.fn(),
  };

  class AlwaysActiveJwtAuthGuard {
    canActivate(context: any) {
      context.switchToHttp().getRequest().user = adminPayload;
      return true;
    }
  }

  class ManagerJwtAuthGuard {
    canActivate(context: any) {
      context.switchToHttp().getRequest().user = managerPayload;
      return true;
    }
  }

  class VeterinarianJwtAuthGuard {
    canActivate(context: any) {
      context.switchToHttp().getRequest().user = veterinarianPayload;
      return true;
    }
  }

  class NoTokenJwtAuthGuard {
    canActivate() {
      throw new UnauthorizedException();
    }
  }

  async function createApp(guardClass: any): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        RolesGuard,
        {
          provide: JwtService,
          useValue: { verify: jest.fn().mockReturnValue(adminPayload), sign: jest.fn().mockReturnValue('signed-token') },
        },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard as any)
      .useClass(guardClass as any)
      .compile();

    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    return app;
  }

  describe('POST /api/v1/users', () => {
    let app: INestApplication;

    const validDto = {
      email: 'newuser@refugiapp.local',
      password: 'valid-password-12chars',
      firstName: 'New',
      lastName: 'User',
    };

    beforeAll(async () => {
      app = await createApp(AlwaysActiveJwtAuthGuard);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it('creates a user when called by an admin', async () => {
      const created = new User(
        VALID_UUID,
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockUsersService.createUser.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body.email).toBe('newuser@refugiapp.local');
      expect(res.body.roles).toContain('shelter_manager');
    });

    it('returns 409 when email is already registered', async () => {
      mockUsersService.createUser.mockRejectedValue(
        new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'Email is already registered.' }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('EMAIL_ALREADY_EXISTS');
        });
    });

    it('returns 400 when DTO is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer admin-token')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);
    });

    it('uses default shelter_manager role when roles are not provided', async () => {
      const created = new User(
        '22222222-2222-2222-2222-222222222222',
        'manager2@refugiapp.local',
        'New',
        'Manager',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockUsersService.createUser.mockResolvedValue(created);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, email: 'manager2@refugiapp.local' })
        .expect(201);

      expect(res.body.roles).toEqual(['shelter_manager']);
    });

    it('returns 403 when called by a manager', async () => {
      const managerApp = await createApp(ManagerJwtAuthGuard);

      await request(managerApp.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer manager-token')
        .send(validDto)
        .expect(403);

      await managerApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createApp(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/users')
        .send(validDto)
        .expect(401);

      await noTokenApp.close();
    });
  });

  describe('POST /api/v1/users/:id/deactivate', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AlwaysActiveJwtAuthGuard);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it('deactivates a user when called by an admin', async () => {
      mockUsersService.deactivateUser.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${VALID_UUID}/deactivate`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);
    });

    it('returns 404 when user does not exist', async () => {
      mockUsersService.deactivateUser.mockRejectedValue(
        new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'User with id does-not-exist was not found.' }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/users/22222222-2222-2222-2222-222222222222/deactivate')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('POST /api/v1/users/:id/activate', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AlwaysActiveJwtAuthGuard);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it('reactivates a user when called by an admin', async () => {
      const reactivated = new User(
        VALID_UUID,
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockUsersService.activateUser.mockResolvedValue(reactivated);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${VALID_UUID}/activate`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 404 when user does not exist', async () => {
      mockUsersService.activateUser.mockRejectedValue(
        new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'User with id does-not-exist was not found.' }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/users/22222222-2222-2222-2222-222222222222/activate')
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('GET /api/v1/users/me', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AlwaysActiveJwtAuthGuard);
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns the full profile for an admin', async () => {
      mockUsersService.getProfile.mockResolvedValue(new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.ADMIN],
        true,
      ));

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer admin-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: 'admin-id',
            email: 'admin@refugiapp.local',
            firstName: 'Admin',
            lastName: 'One',
            roles: [UserRole.ADMIN],
            isActive: true,
          });
          expect(body).not.toHaveProperty('passwordHash');
        });
    });

    it('returns the full profile for a shelter_manager', async () => {
      const managerApp = await createApp(ManagerJwtAuthGuard);
      mockUsersService.getProfile.mockResolvedValue(new User(
        'manager-id',
        'manager@refugiapp.local',
        'Shelter',
        'Manager',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      await request(managerApp.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer manager-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: 'manager-id',
            email: 'manager@refugiapp.local',
            firstName: 'Shelter',
            lastName: 'Manager',
            roles: [UserRole.SHELTER_MANAGER],
            isActive: true,
          });
          expect(body).not.toHaveProperty('passwordHash');
        });

      await managerApp.close();
    });

    it('returns the full profile for a veterinarian', async () => {
      const veterinarianApp = await createApp(VeterinarianJwtAuthGuard);
      mockUsersService.getProfile.mockResolvedValue(new User(
        'veterinarian-id',
        'veterinarian@refugiapp.local',
        'Vet',
        'One',
        [UserRole.VETERINARIAN],
        true,
      ));

      await request(veterinarianApp.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer veterinarian-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({
            id: 'veterinarian-id',
            email: 'veterinarian@refugiapp.local',
            firstName: 'Vet',
            lastName: 'One',
            roles: [UserRole.VETERINARIAN],
            isActive: true,
          });
          expect(body).not.toHaveProperty('passwordHash');
        });

      await veterinarianApp.close();
    });

    it('returns 404 when the authenticated user does not exist', async () => {
      mockUsersService.getProfile.mockRejectedValue(
        new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'User with id admin-id was not found.' }),
      );

      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer admin-token')
        .expect(404)
        .expect(({ body }) => {
          expect(body.code).toBe('RESOURCE_NOT_FOUND');
        });
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createApp(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      await noTokenApp.close();
    });
  });
});