import { ExecutionContext, INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { SpeciesService } from '../src/modules/species/application/services/species.service';
import { Breed } from '../src/modules/species/domain/entities/breed.entity';
import { Species } from '../src/modules/species/domain/entities/species.entity';
import { SpeciesController } from '../src/modules/species/interfaces/controllers/species.controller';

const adminPayload = { id: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const veterinarianPayload = {
  id: 'veterinarian-user-id',
  email: 'veterinarian@refugiapp.local',
  roles: [UserRole.VETERINARIAN],
};
const SPECIES_UUID = '11111111-1111-4111-8111-111111111111';
const BREED_UUID = '22222222-2222-4222-8222-222222222222';

describe('Species (e2e)', () => {
  let app: INestApplication;
  const speciesService = {
    listSpecies: jest.fn(),
    listBreedsBySpeciesId: jest.fn(),
  };

  class AdminJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = adminPayload;
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
      controllers: [SpeciesController],
      providers: [{ provide: SpeciesService, useValue: speciesService }, RolesGuard],
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

  describe('GET /api/v1/species', () => {
    it('returns the species catalog without internal fields', async () => {
      speciesService.listSpecies.mockResolvedValue([createSpecies()]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/species')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toEqual({
        items: [{ id: SPECIES_UUID, slug: 'dog', labelEs: 'Perro' }],
      });
      expect(res.body.items[0]).not.toHaveProperty('isActive');
      expect(res.body.items[0]).not.toHaveProperty('sortOrder');
    });

    it('allows veterinarians to read the catalog', async () => {
      const veterinarianApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      speciesService.listSpecies.mockResolvedValue([]);

      await request(veterinarianApp.getHttpServer())
        .get('/api/v1/species')
        .set('Authorization', 'Bearer veterinarian-token')
        .expect(200)
        .expect(({ body }) => {
          expect(body.items).toEqual([]);
        });

      await veterinarianApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer()).get('/api/v1/species').expect(401);

      await noTokenApp.close();
    });
  });

  describe('GET /api/v1/species/:id/breeds', () => {
    it('returns the breeds for a species without internal fields', async () => {
      speciesService.listBreedsBySpeciesId.mockResolvedValue([createBreed()]);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/species/${SPECIES_UUID}/breeds`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toEqual({
        items: [
          {
            id: BREED_UUID,
            speciesId: SPECIES_UUID,
            slug: 'mestizo',
            labelEs: 'Mestizo',
          },
        ],
      });
      expect(res.body.items[0]).not.toHaveProperty('isActive');
      expect(speciesService.listBreedsBySpeciesId).toHaveBeenCalledWith(SPECIES_UUID);
    });

    it('returns 404 when the species does not exist', async () => {
      speciesService.listBreedsBySpeciesId.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Species with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/species/${SPECIES_UUID}/breeds`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });

    it('rejects a non-uuid species id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/species/not-a-uuid/breeds')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(speciesService.listBreedsBySpeciesId).not.toHaveBeenCalled();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .get(`/api/v1/species/${SPECIES_UUID}/breeds`)
        .expect(401);

      await noTokenApp.close();
    });
  });

  function createSpecies(): Species {
    return new Species(SPECIES_UUID, 'dog', 'Perro', true, 10);
  }

  function createBreed(): Breed {
    return new Breed(BREED_UUID, SPECIES_UUID, 'mestizo', 'Mestizo', true);
  }
});