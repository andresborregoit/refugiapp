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
import { correlationIdMiddleware } from '../src/common/middleware/correlation-id.middleware';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { AnimalStatus } from '../src/modules/animals/domain/enums/animal-status.enum';
import { DashboardService } from '../src/modules/dashboard/application/services/dashboard.service';
import { DashboardController } from '../src/modules/dashboard/interfaces/controllers/dashboard.controller';

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

function buildOverview() {
  return {
    totals: {
      animals: 3,
      byStatus: {
        admitted: 1,
        under_treatment: 1,
        available_for_adoption: 1,
        adopted: 0,
        deceased: 0,
      },
    },
    recentAnimals: [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'Luna',
        species: 'dog',
        status: AnimalStatus.ADMITTED,
        profilePhotoMediaId: null,
      },
    ],
  };
}

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  const dashboardService = { getOverview: jest.fn() };

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
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: dashboardService }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guard)
      .compile();

    const testApp = moduleRef.createNestApplication();
    testApp.setGlobalPrefix('api/v1');
    testApp.use(correlationIdMiddleware);
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

  describe('GET /api/v1/dashboard/overview', () => {
    it('returns the overview with profilePhotoMediaId present when called by an admin', async () => {
      dashboardService.getOverview.mockResolvedValue(buildOverview());

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toMatchObject({
        totals: { animals: 3 },
        recentAnimals: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            name: 'Luna',
            species: 'dog',
            status: AnimalStatus.ADMITTED,
          },
        ],
      });
      expect(res.body.recentAnimals[0]).toHaveProperty('profilePhotoMediaId');
      expect(res.body.recentAnimals[0].profilePhotoMediaId).toBeNull();
      expect(dashboardService.getOverview).toHaveBeenCalledTimes(1);
    });

    it('keeps a non-null profilePhotoMediaId in the response', async () => {
      const mediaId = '22222222-2222-4222-8222-222222222222';
      dashboardService.getOverview.mockResolvedValue({
        ...buildOverview(),
        recentAnimals: [{ ...buildOverview().recentAnimals[0], profilePhotoMediaId: mediaId }],
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.recentAnimals[0].profilePhotoMediaId).toBe(mediaId);
    });

    it('returns the overview when called by a shelter manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      dashboardService.getOverview.mockResolvedValue(buildOverview());

      await request(managerApp.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', 'Bearer manager-token')
        .expect(200);

      expect(dashboardService.getOverview).toHaveBeenCalled();

      await managerApp.close();
    });

    it('returns the overview when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      dashboardService.getOverview.mockResolvedValue(buildOverview());

      await request(vetApp.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', 'Bearer veterinarian-token')
        .expect(200);

      await vetApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .expect(401);

      expect(dashboardService.getOverview).not.toHaveBeenCalled();

      await noTokenApp.close();
    });

    it('propagates the correlation id header on the response', async () => {
      dashboardService.getOverview.mockResolvedValue(buildOverview());

      const res = await request(app.getHttpServer())
        .get('/api/v1/dashboard/overview')
        .set('Authorization', 'Bearer admin-token')
        .set('x-request-id', 'dashboard-e2e-request-id')
        .expect(200);

      expect(res.headers['x-request-id']).toBe('dashboard-e2e-request-id');
    });
  });
});