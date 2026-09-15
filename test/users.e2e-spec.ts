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
  let app: INestApplication;

  const mockUsersService = {
    createUser: jest.fn(),
    deactivateUser: jest.fn(),
    activateUser: jest.fn(),
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

  beforeAll(async () => {
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
      .useClass(AlwaysActiveJwtAuthGuard as any)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/users', () => {
    const validDto = {
      email: 'newuser@refugiapp.local',
      password: 'valid-password-12chars',
      firstName: 'New',
      lastName: 'User',
    };

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

    it('returns 403 when called by a non-admin user', async () => {
      const managerModuleRef = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          RolesGuard,
          { provide: JwtService, useValue: { verify: jest.fn().mockReturnValue(managerPayload), sign: jest.fn() } },
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      })
        .overrideGuard(JwtAuthGuard as any)
        .useClass(ManagerJwtAuthGuard as any)
        .compile();

      const managerApp = managerModuleRef.createNestApplication();
      managerApp.setGlobalPrefix('api/v1');
      managerApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      managerApp.useGlobalFilters(new HttpExceptionFilter());
      await managerApp.init();

      await request(managerApp.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer manager-token')
        .send(validDto)
        .expect(403);

      await request(managerApp.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer manager-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body.roles).toEqual([UserRole.SHELTER_MANAGER]);
        });

      await managerApp.close();
    });

    it('allows a veterinarian to access their profile and rejects admin actions', async () => {
      const veterinarianModuleRef = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          RolesGuard,
          {
            provide: JwtService,
            useValue: { verify: jest.fn().mockReturnValue(veterinarianPayload), sign: jest.fn() },
          },
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      })
        .overrideGuard(JwtAuthGuard as any)
        .useClass(VeterinarianJwtAuthGuard as any)
        .compile();

      const veterinarianApp = veterinarianModuleRef.createNestApplication();
      veterinarianApp.setGlobalPrefix('api/v1');
      veterinarianApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      veterinarianApp.useGlobalFilters(new HttpExceptionFilter());
      await veterinarianApp.init();

      await request(veterinarianApp.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', 'Bearer veterinarian-token')
        .send(validDto)
        .expect(403);

      await request(veterinarianApp.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer veterinarian-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body.roles).toEqual([UserRole.VETERINARIAN]);
        });

      await veterinarianApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenModuleRef = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          RolesGuard,
          { provide: JwtService, useValue: { verify: jest.fn().mockReturnValue(null), sign: jest.fn() } },
          { provide: ConfigService, useValue: { get: jest.fn() } },
        ],
      })
        .overrideGuard(JwtAuthGuard as any)
        .useClass(NoTokenJwtAuthGuard as any)
        .compile();

      const noTokenApp = noTokenModuleRef.createNestApplication();
      noTokenApp.setGlobalPrefix('api/v1');
      noTokenApp.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
      );
      noTokenApp.useGlobalFilters(new HttpExceptionFilter());
      await noTokenApp.init();

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/users')
        .send(validDto)
        .expect(401);

      await noTokenApp.close();
    });
  });

  describe('POST /api/v1/users/:id/deactivate', () => {
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
});
