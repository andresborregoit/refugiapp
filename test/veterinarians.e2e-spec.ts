import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { VeterinariansService } from '../src/modules/veterinarians/application/services/veterinarians.service';
import { Veterinarian } from '../src/modules/veterinarians/domain/entities/veterinarian.entity';
import { VeterinariansController } from '../src/modules/veterinarians/interfaces/controllers/veterinarians.controller';

const adminPayload = { id: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const managerPayload = {
  id: 'manager-id',
  email: 'manager@refugiapp.local',
  roles: [UserRole.SHELTER_MANAGER],
};
const veterinarianPayload = {
  id: 'veterinarian-user-id',
  email: 'veterinarian@refugiapp.local',
  roles: [UserRole.VETERINARIAN],
};
const VALID_UUID = '11111111-1111-4111-8111-111111111111';
const USER_UUID = '22222222-2222-4222-8222-222222222222';

describe('Veterinarians (e2e)', () => {
  let app: INestApplication;
  const veterinariansService = {
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };

  class AdminJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = adminPayload;
      return true;
    }
  }

  class ManagerJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = managerPayload;
      return true;
    }
  }

  class VeterinarianJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = veterinarianPayload;
      return true;
    }
  }

  class NoTokenJwtAuthGuard {
    canActivate(): boolean {
      throw new UnauthorizedException();
    }
  }

  async function createAppWithGuard(
    guard: new () => { canActivate(context: ExecutionContext): boolean },
  ): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [VeterinariansController],
      providers: [{ provide: VeterinariansService, useValue: veterinariansService }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guard)
      .compile();

    const testApp = moduleRef.createNestApplication();
    testApp.setGlobalPrefix('api/v1');
    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    testApp.useGlobalFilters(new HttpExceptionFilter());
    await testApp.init();

    return testApp;
  }

  beforeAll(async () => {
    app = await createAppWithGuard(AdminJwtAuthGuard);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/veterinarians', () => {
    const validDto = {
      firstName: 'Sofia',
      lastName: 'Martinez',
      licenseNumber: 'VET-001',
    };

    it('creates a veterinarian when called by an admin', async () => {
      veterinariansService.create.mockResolvedValue(createVeterinarian());

      const res = await request(app.getHttpServer())
        .post('/api/v1/veterinarians')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body).toMatchObject({
        id: VALID_UUID,
        userId: null,
        firstName: 'Sofia',
        lastName: 'Martinez',
        licenseNumber: 'VET-001',
        isActive: true,
      });
      expect(veterinariansService.create).toHaveBeenCalledWith(expect.objectContaining(validDto));
    });

    it('creates a veterinarian linked to an optional userId when called by a manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      veterinariansService.create.mockResolvedValue(createVeterinarian({ userId: USER_UUID }));

      await request(managerApp.getHttpServer())
        .post('/api/v1/veterinarians')
        .set('Authorization', 'Bearer manager-token')
        .send({ ...validDto, userId: USER_UUID })
        .expect(201);

      expect(veterinariansService.create).toHaveBeenCalledWith(
        expect.objectContaining({ licenseNumber: 'VET-001', userId: USER_UUID }),
      );

      await managerApp.close();
    });

    it('returns 409 when licenseNumber is duplicated', async () => {
      veterinariansService.create.mockRejectedValue(
        new ConflictException({
          code: 'LICENSE_NUMBER_ALREADY_EXISTS',
          message: 'License number is already registered.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/veterinarians')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('LICENSE_NUMBER_ALREADY_EXISTS');
        });
    });

    it('returns 400 when DTO is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/veterinarians')
        .set('Authorization', 'Bearer admin-token')
        .send({ firstName: 'Sofia', licenseNumber: 'VET-001', email: 'not-an-email' })
        .expect(400);

      expect(veterinariansService.create).not.toHaveBeenCalled();
    });

    it('returns 403 when called by a veterinarian', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(veterinarianApp.getHttpServer())
        .post('/api/v1/veterinarians')
        .set('Authorization', 'Bearer veterinarian-token')
        .send(validDto)
        .expect(403);

      expect(veterinariansService.create).not.toHaveBeenCalled();

      await veterinarianApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/veterinarians')
        .send(validDto)
        .expect(401);

      await noTokenApp.close();
    });
  });

  it('returns a paginated filtered list', async () => {
    veterinariansService.list.mockResolvedValue({
      items: [createVeterinarian()],
      page: 2,
      limit: 10,
      total: 11,
    });

    await request(app.getHttpServer())
      .get('/api/v1/veterinarians')
      .query({ page: 2, limit: 10, name: 'sofia', licenseNumber: 'VET', isActive: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ page: 2, limit: 10, total: 11 });
        expect(body.items).toHaveLength(1);
      });

    expect(veterinariansService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        name: 'sofia',
        licenseNumber: 'VET',
        isActive: true,
      }),
    );
  });

  it('rejects unsafe pagination limits', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/veterinarians')
      .query({ limit: 101 })
      .expect(400);
  });

  it('allows veterinarians to read the list', async () => {
    const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
    veterinariansService.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    await request(veterinarianApp.getHttpServer())
      .get('/api/v1/veterinarians')
      .set('Authorization', 'Bearer veterinarian-token')
      .expect(200);

    await veterinarianApp.close();
  });

  it('returns a veterinarian by id', async () => {
    veterinariansService.findById.mockResolvedValue(createVeterinarian());

    await request(app.getHttpServer())
      .get(`/api/v1/veterinarians/${VALID_UUID}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: VALID_UUID, licenseNumber: 'VET-001' });
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('returns 404 when the veterinarian does not exist', async () => {
    veterinariansService.findById.mockRejectedValue(
      new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Veterinarian with id missing-id was not found.',
      }),
    );

    await request(app.getHttpServer()).get(`/api/v1/veterinarians/${VALID_UUID}`).expect(404);
  });

  it('updates a veterinarian when called by an admin', async () => {
    veterinariansService.update.mockResolvedValue(createVeterinarian({ lastName: 'Gomez' }));

    await request(app.getHttpServer())
      .patch(`/api/v1/veterinarians/${VALID_UUID}`)
      .set('Authorization', 'Bearer admin-token')
      .send({ lastName: 'Gomez', notes: 'Updated notes' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.lastName).toBe('Gomez');
      });

    expect(veterinariansService.update).toHaveBeenCalledWith(
      VALID_UUID,
      expect.objectContaining({ lastName: 'Gomez', notes: 'Updated notes' }),
    );
  });

  it('deactivates a veterinarian when called by an admin', async () => {
    veterinariansService.deactivate.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post(`/api/v1/veterinarians/${VALID_UUID}/deactivate`)
      .set('Authorization', 'Bearer admin-token')
      .expect(204);

    expect(veterinariansService.deactivate).toHaveBeenCalledWith(VALID_UUID);
  });

  function createVeterinarian(overrides: Partial<Veterinarian> = {}): Veterinarian {
    return Object.assign(
      new Veterinarian(
        VALID_UUID,
        null,
        'Sofia',
        'Martinez',
        'VET-001',
        'sofia@refugiapp.local',
        '+5491100000000',
        'Clinical lead',
        true,
      ),
      overrides,
    );
  }
});
