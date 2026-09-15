import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ResourceNotFoundException } from '../src/common/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '../src/common/exceptions/resource-conflict.exception';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { AnimalsService } from '../src/modules/animals/application/services/animals.service';
import { AnimalHistoryEventsService } from '../src/modules/animals/application/services/animal-history-events.service';
import { AnimalsController } from '../src/modules/animals/interfaces/controllers/animals.controller';
import { AnimalHistoryEventsController } from '../src/modules/animals/interfaces/controllers/animal-history-events.controller';
import { AnimalSex } from '../src/modules/animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { AnimalHistoryEventType } from '../src/modules/animals/domain/enums/animal-history-event-type.enum';

const adminPayload = { id: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const managerPayload = {
  id: 'manager-id',
  email: 'manager@refugiapp.local',
  roles: [UserRole.SHELTER_MANAGER],
};
const veterinarianPayload = {
  id: 'veterinarian-id',
  email: 'veterinarian@refugiapp.local',
  roles: [UserRole.VETERINARIAN],
};
const VALID_UUID = '11111111-1111-1111-1111-111111111111';

describe('Animals (e2e)', () => {
  let app: INestApplication;
  const animalsService = {
    create: jest.fn(),
    list: jest.fn(),
    findById: jest.fn(),
    changeStatus: jest.fn(),
  };
  const eventsService = {
    create: jest.fn(),
    list: jest.fn(),
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
      controllers: [AnimalsController, AnimalHistoryEventsController],
      providers: [
        { provide: AnimalsService, useValue: animalsService },
        { provide: AnimalHistoryEventsService, useValue: eventsService },
        RolesGuard,
      ],
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

  describe('POST /api/v1/animals', () => {
    const validDto = {
      name: 'Luna',
      species: 'dog',
      intakeDate: '2026-01-10',
    };

    it('creates an animal when called by an admin', async () => {
      animalsService.create.mockResolvedValue({
        id: VALID_UUID,
        name: 'Luna',
        species: 'dog',
        breed: null,
        sex: AnimalSex.UNKNOWN,
        status: AnimalStatus.ADMITTED,
        intakeDate: new Date('2026-01-10'),
        birthDate: null,
        notes: null,
        profilePhotoMediaId: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body).toMatchObject({ id: VALID_UUID, name: 'Luna', species: 'dog' });
      expect(animalsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Luna', species: 'dog', intakeDate: '2026-01-10' }),
        'admin-id',
      );
    });

    it('returns 400 when the DTO is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Authorization', 'Bearer admin-token')
        .send({ species: 'dog', intakeDate: 'not-a-date' })
        .expect(400);

      expect(animalsService.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the profile photo media asset does not exist', async () => {
      animalsService.create.mockRejectedValue(
        new ResourceNotFoundException('MediaAsset', '22222222-2222-4222-8222-222222222222'),
      );

      await request(app.getHttpServer())
        .post('/api/v1/animals')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, profilePhotoMediaId: '22222222-2222-4222-8222-222222222222' })
        .expect(404)
        .expect(({ body }) => {
          expect(body.code).toBe('RESOURCE_NOT_FOUND');
        });
    });

    it('returns 403 when called by a veterinarian', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(veterinarianApp.getHttpServer())
        .post('/api/v1/animals')
        .set('Authorization', 'Bearer veterinarian-token')
        .send(validDto)
        .expect(403);

      expect(animalsService.create).not.toHaveBeenCalled();

      await veterinarianApp.close();
    });

    it('creates an animal when called by a shelter manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      animalsService.create.mockResolvedValue({ id: VALID_UUID, name: 'Luna' });

      await request(managerApp.getHttpServer())
        .post('/api/v1/animals')
        .set('Authorization', 'Bearer manager-token')
        .send(validDto)
        .expect(201);

      expect(animalsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Luna' }),
        'manager-id',
      );

      await managerApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/animals')
        .send(validDto)
        .expect(401);

      await noTokenApp.close();
    });
  });

  it('returns a paginated filtered list', async () => {
    animalsService.list.mockResolvedValue({
      items: [
        {
          id: 'animal-id',
          name: 'Luna',
          species: 'dog',
          breed: 'mixed',
          sex: AnimalSex.FEMALE,
          status: AnimalStatus.ADMITTED,
          intakeDate: new Date('2026-01-01'),
          birthDate: null,
          notes: null,
          profilePhotoMediaId: null,
        },
      ],
      page: 2,
      limit: 10,
      total: 11,
    });

    await request(app.getHttpServer())
      .get('/api/v1/animals')
      .query({ page: 2, limit: 10, status: AnimalStatus.ADMITTED, species: 'dog', sex: AnimalSex.FEMALE, name: 'luna' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ page: 2, limit: 10, total: 11 });
        expect(body.items).toHaveLength(1);
      });

    expect(animalsService.list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 10,
        status: AnimalStatus.ADMITTED,
        species: 'dog',
        sex: AnimalSex.FEMALE,
        name: 'luna',
      }),
    );
  });

  it('rejects unsafe pagination limits', async () => {
    await request(app.getHttpServer()).get('/api/v1/animals').query({ limit: 101 }).expect(400);
  });

  it('returns an animal by id', async () => {
    animalsService.findById.mockResolvedValue({ id: 'animal-id', name: 'Luna' });

    await request(app.getHttpServer())
      .get('/api/v1/animals/11111111-1111-1111-1111-111111111111')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({ id: 'animal-id', name: 'Luna' });
      });
  });

  it('returns 404 when the animal does not exist', async () => {
    animalsService.findById.mockRejectedValue(new ResourceNotFoundException('Animal', 'missing-id'));

    await request(app.getHttpServer())
      .get('/api/v1/animals/11111111-1111-1111-1111-111111111111')
      .expect(404)
      .expect(({ body }) => {
        expect(body.code).toBe('RESOURCE_NOT_FOUND');
      });
  });

  describe('PATCH /api/v1/animals/:id/status', () => {
    it('changes the status when called by an admin', async () => {
      animalsService.changeStatus.mockResolvedValue({
        id: VALID_UUID,
        name: 'Luna',
        status: AnimalStatus.UNDER_TREATMENT,
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: AnimalStatus.UNDER_TREATMENT })
        .expect(200)
        .expect(({ body }) => {
          expect(body.status).toBe(AnimalStatus.UNDER_TREATMENT);
        });

      expect(animalsService.changeStatus).toHaveBeenCalledWith(
        VALID_UUID,
        AnimalStatus.UNDER_TREATMENT,
        'admin-id',
        undefined,
      );
    });

    it('changes the status when called by a shelter manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      animalsService.changeStatus.mockResolvedValue({
        id: VALID_UUID,
        status: AnimalStatus.AVAILABLE_FOR_ADOPTION,
      });

      await request(managerApp.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer manager-token')
        .send({ status: AnimalStatus.AVAILABLE_FOR_ADOPTION })
        .expect(200);

      expect(animalsService.changeStatus).toHaveBeenCalledWith(
        VALID_UUID,
        AnimalStatus.AVAILABLE_FOR_ADOPTION,
        'manager-id',
        undefined,
      );

      await managerApp.close();
    });

    it('returns 403 when called by a veterinarian', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(veterinarianApp.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer veterinarian-token')
        .send({ status: AnimalStatus.UNDER_TREATMENT })
        .expect(403);

      expect(animalsService.changeStatus).not.toHaveBeenCalled();

      await veterinarianApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .send({ status: AnimalStatus.UNDER_TREATMENT })
        .expect(401);

      await noTokenApp.close();
    });

    it('returns 404 when the animal does not exist', async () => {
      animalsService.changeStatus.mockRejectedValue(
        new ResourceNotFoundException('Animal', VALID_UUID),
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: AnimalStatus.UNDER_TREATMENT })
        .expect(404)
        .expect(({ body }) => {
          expect(body.code).toBe('RESOURCE_NOT_FOUND');
        });
    });

    it('returns 409 when the transition is invalid', async () => {
      animalsService.changeStatus.mockRejectedValue(
        new ResourceConflictException(
          'Transition from admitted to adopted is not allowed.',
          'INVALID_STATUS_TRANSITION',
        ),
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: AnimalStatus.ADOPTED })
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('INVALID_STATUS_TRANSITION');
        });
    });

    it('returns 409 when the status is unchanged', async () => {
      animalsService.changeStatus.mockRejectedValue(
        new ResourceConflictException(
          'The animal is already in the requested status.',
          'STATUS_UNCHANGED',
        ),
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: AnimalStatus.ADMITTED })
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('STATUS_UNCHANGED');
        });
    });

    it('returns 400 when the status is not a valid enum value', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/animals/${VALID_UUID}/status`)
        .set('Authorization', 'Bearer admin-token')
        .send({ status: 'not-a-status' })
        .expect(400);

      expect(animalsService.changeStatus).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/animals/:animalId/events', () => {
    it('creates an event when called by an admin', async () => {
      eventsService.create.mockResolvedValue({
        id: 'event-id',
        animalId: VALID_UUID,
        eventType: AnimalHistoryEventType.GENERAL_NOTE,
        description: 'Moved to foster home.',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        createdByUserId: 'admin-id',
        metadata: {},
      });

      await request(app.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .send({ eventType: 'general_note', description: 'Moved to foster home.' })
        .expect(201)
        .expect(({ body }) => {
          expect(body.eventType).toBe('general_note');
          expect(body.description).toBe('Moved to foster home.');
        });

      expect(eventsService.create).toHaveBeenCalledWith(
        VALID_UUID,
        'general_note',
        'Moved to foster home.',
        'admin-id',
        undefined,
      );
    });

    it('creates an event when called by a shelter manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      eventsService.create.mockResolvedValue({
        id: 'event-id',
        eventType: AnimalHistoryEventType.BEHAVIOR_NOTE,
        description: 'Friendly.',
      });

      await request(managerApp.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer manager-token')
        .send({ eventType: 'behavior_note', description: 'Friendly.' })
        .expect(201);

      expect(eventsService.create).toHaveBeenCalledWith(
        VALID_UUID,
        'behavior_note',
        'Friendly.',
        'manager-id',
        undefined,
      );

      await managerApp.close();
    });

    it('returns 403 when called by a veterinarian', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(veterinarianApp.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer veterinarian-token')
        .send({ eventType: 'general_note', description: 'Note' })
        .expect(403);

      expect(eventsService.create).not.toHaveBeenCalled();

      await veterinarianApp.close();
    });

    it('returns 400 when eventType is reserved (status_change)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .send({ eventType: 'status_change', description: 'Invalid' })
        .expect(400);

      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when eventType is reserved (intake)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .send({ eventType: 'intake', description: 'Invalid' })
        .expect(400);

      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when eventType is reserved (adoption)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .send({ eventType: 'adoption', description: 'Invalid' })
        .expect(400);

      expect(eventsService.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the animal does not exist', async () => {
      eventsService.create.mockRejectedValue(
        new ResourceNotFoundException('Animal', VALID_UUID),
      );

      await request(app.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .send({ eventType: 'general_note', description: 'Note' })
        .expect(404)
        .expect(({ body }) => {
          expect(body.code).toBe('RESOURCE_NOT_FOUND');
        });
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post(`/api/v1/animals/${VALID_UUID}/events`)
        .send({ eventType: 'general_note', description: 'Note' })
        .expect(401);

      await noTokenApp.close();
    });
  });

  describe('GET /api/v1/animals/:animalId/events', () => {
    it('returns paginated events for all 3 roles', async () => {
      eventsService.list.mockResolvedValue({
        items: [
          {
            id: 'event-id',
            animalId: VALID_UUID,
            eventType: AnimalHistoryEventType.STATUS_CHANGE,
            description: 'Status changed from admitted to under_treatment.',
            occurredAt: new Date('2026-03-10T10:00:00.000Z'),
            createdByUserId: 'admin-id',
            metadata: { from: 'admitted', to: 'under_treatment' },
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      });

      await request(app.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body).toMatchObject({ page: 1, limit: 20, total: 1 });
          expect(body.items).toHaveLength(1);
          expect(body.items[0].eventType).toBe('status_change');
        });
    });

    it('filters events by eventType', async () => {
      eventsService.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await request(app.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .query({ eventType: 'general_note' })
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(eventsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'general_note' }),
      );
    });

    it('returns events when called by a veterinarian', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      eventsService.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await request(veterinarianApp.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer veterinarian-token')
        .expect(200);

      await veterinarianApp.close();
    });

    it('rejects unsafe pagination limits', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .query({ limit: 101 })
        .set('Authorization', 'Bearer admin-token')
        .expect(400);
    });

    it('returns 404 when the animal does not exist', async () => {
      eventsService.list.mockRejectedValue(
        new ResourceNotFoundException('Animal', VALID_UUID),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404)
        .expect(({ body }) => {
          expect(body.code).toBe('RESOURCE_NOT_FOUND');
        });
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .get(`/api/v1/animals/${VALID_UUID}/events`)
        .expect(401);

      await noTokenApp.close();
    });
  });
});
