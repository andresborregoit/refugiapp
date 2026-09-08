import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { AnimalsService } from '../src/modules/animals/application/services/animals.service';
import { AnimalsController } from '../src/modules/animals/interfaces/controllers/animals.controller';
import { AnimalSex } from '../src/modules/animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { ResourceNotFoundException } from '../src/common/exceptions/resource-not-found.exception';

describe('Animals (e2e)', () => {
  let app: INestApplication;
  const animalsService = {
    list: jest.fn(),
    findById: jest.fn(),
  };

  class AuthenticatedJwtGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = {
        id: 'admin-id',
        email: 'admin@refugiapp.local',
        roles: [UserRole.ADMIN],
      };
      return true;
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AnimalsController],
      providers: [AnimalsService, RolesGuard],
    })
      .overrideProvider(AnimalsService)
      .useValue(animalsService)
      .overrideGuard(JwtAuthGuard)
      .useClass(AuthenticatedJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
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

  it('returns a paginated filtered list', async () => {
    animalsService.list.mockResolvedValue({
      items: [
        {
          id: 'animal-id',
          name: 'Luna',
          species: 'dog',
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
});
