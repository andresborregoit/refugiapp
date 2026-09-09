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
import { MedicalRecordsService } from '../src/modules/medical-records/application/services/medical-records.service';
import { MedicalRecord } from '../src/modules/medical-records/domain/entities/medical-record.entity';
import { MedicalRecordType } from '../src/modules/medical-records/domain/enums/medical-record-type.enum';
import { AnimalMedicalRecordsController } from '../src/modules/medical-records/interfaces/controllers/animal-medical-records.controller';
import { MedicalRecordsController } from '../src/modules/medical-records/interfaces/controllers/medical-records.controller';

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

describe('MedicalRecords (e2e)', () => {
  let app: INestApplication;
  const medicalRecordsService = {
    create: jest.fn(),
    findById: jest.fn(),
    listByAnimal: jest.fn(),
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
      controllers: [MedicalRecordsController, AnimalMedicalRecordsController],
      providers: [{ provide: MedicalRecordsService, useValue: medicalRecordsService }, RolesGuard],
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

  describe('POST /api/v1/medical-records', () => {
    const validDto = {
      animalId: '11111111-1111-4111-8111-111111111111',
      recordType: MedicalRecordType.CONSULTATION,
      title: 'Annual checkup',
      occurredAt: '2026-03-10T10:00:00.000Z',
    };

    it('creates a medical record when called by an admin', async () => {
      medicalRecordsService.create.mockResolvedValue(createMedicalRecord());

      const res = await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Annual checkup',
      });
      expect(medicalRecordsService.create).toHaveBeenCalledWith(
        expect.objectContaining(validDto),
      );
    });

    it('creates a medical record when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      medicalRecordsService.create.mockResolvedValue(createMedicalRecord());

      await request(vetApp.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer vet-token')
        .send(validDto)
        .expect(201);

      expect(medicalRecordsService.create).toHaveBeenCalled();

      await vetApp.close();
    });

    it('returns 403 when called by a shelter_manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);

      await request(managerApp.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer manager-token')
        .send(validDto)
        .expect(403);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();

      await managerApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/medical-records')
        .send(validDto)
        .expect(401);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();

      await noTokenApp.close();
    });

    it('returns 404 when the animal does not exist', async () => {
      medicalRecordsService.create.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Animal with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, animalId: '11111111-1111-4111-8111-111111111111' })
        .expect(404);
    });

    it('returns 404 when the veterinarian does not exist', async () => {
      medicalRecordsService.create.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Veterinarian with id missing-vet was not found.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          veterinarianId: '22222222-2222-4222-8222-222222222222',
        })
        .expect(404);
    });

    it('returns 409 when the veterinarian is inactive', async () => {
      medicalRecordsService.create.mockRejectedValue(
        new ConflictException({
          code: 'VETERINARIAN_INACTIVE',
          message: 'The veterinarian is inactive and cannot be linked to new records.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          veterinarianId: '22222222-2222-4222-8222-222222222222',
        })
        .expect(409)
        .expect(({ body }) => {
          expect(body.code).toBe('VETERINARIAN_INACTIVE');
        });
    });

    it('returns 404 when an attachment media asset does not exist', async () => {
      medicalRecordsService.create.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'MediaAsset with id missing-media was not found.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          attachmentMediaIds: ['33333333-3333-4333-8333-333333333333'],
        })
        .expect(404);
    });

    it('returns 400 when recordType is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, recordType: 'invalid_type' })
        .expect(400);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when title is empty', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, title: '' })
        .expect(400);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when occurredAt is not a valid date', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, occurredAt: 'not-a-date' })
        .expect(400);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when body contains unknown properties', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/medical-records')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, unknownField: 'value' })
        .expect(400);

      expect(medicalRecordsService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/animals/:animalId/medical-records', () => {
    const animalId = '11111111-1111-4111-8111-111111111111';

    it('lists medical records when called by an admin', async () => {
      medicalRecordsService.listByAnimal.mockResolvedValue({
        items: [createMedicalRecord({ animalId })],
        page: 2,
        limit: 10,
        total: 1,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer admin-token')
        .query({
          page: 2,
          limit: 10,
          recordType: MedicalRecordType.CONSULTATION,
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-31T23:59:59.000Z',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        page: 2,
        limit: 10,
        total: 1,
        items: [
          {
            id: 'record-id',
            animalId,
            recordType: MedicalRecordType.CONSULTATION,
            title: 'Annual checkup',
          },
        ],
      });
      expect(medicalRecordsService.listByAnimal).toHaveBeenCalledWith(
        animalId,
        expect.objectContaining({
          page: 2,
          limit: 10,
          recordType: MedicalRecordType.CONSULTATION,
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-31T23:59:59.000Z',
        }),
      );
    });

    it('lists medical records when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      medicalRecordsService.listByAnimal.mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await request(vetApp.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer vet-token')
        .expect(200);

      expect(medicalRecordsService.listByAnimal).toHaveBeenCalledWith(
        animalId,
        expect.objectContaining({ page: 1, limit: 20 }),
      );

      await vetApp.close();
    });

    it('returns 403 when called by a shelter_manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);

      await request(managerApp.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer manager-token')
        .expect(403);

      expect(medicalRecordsService.listByAnimal).not.toHaveBeenCalled();

      await managerApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .expect(401);

      expect(medicalRecordsService.listByAnimal).not.toHaveBeenCalled();

      await noTokenApp.close();
    });

    it('returns 404 when the animal does not exist', async () => {
      medicalRecordsService.listByAnimal.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Animal with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('rejects unsafe pagination limits', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer admin-token')
        .query({ limit: 101 })
        .expect(400);

      expect(medicalRecordsService.listByAnimal).not.toHaveBeenCalled();
    });

    it('returns 400 when recordType is invalid', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer admin-token')
        .query({ recordType: 'invalid_type' })
        .expect(400);

      expect(medicalRecordsService.listByAnimal).not.toHaveBeenCalled();
    });

    it('returns 400 when date filters are invalid', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/medical-records`)
        .set('Authorization', 'Bearer admin-token')
        .query({ from: 'not-a-date' })
        .expect(400);

      expect(medicalRecordsService.listByAnimal).not.toHaveBeenCalled();
    });
  });

  function createMedicalRecord(
    overrides: Partial<MedicalRecord> = {},
  ): MedicalRecord {
    return Object.assign(
      new MedicalRecord(
        'record-id',
        'animal-id',
        MedicalRecordType.CONSULTATION,
        'Annual checkup',
        new Date('2026-03-10T10:00:00.000Z'),
        null,
        null,
        null,
        null,
        new Date('2026-03-10T10:00:00.000Z'),
        new Date('2026-03-10T10:00:00.000Z'),
        null,
      ),
      overrides,
    );
  }
});
