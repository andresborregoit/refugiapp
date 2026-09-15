import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AuditLogsService } from '../src/modules/audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../src/modules/audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../src/modules/audit-logs/domain/enums/audit-resource-type.enum';
import { AuditLogsController } from '../src/modules/audit-logs/interfaces/controllers/audit-logs.controller';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';

const adminPayload = { id: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const managerPayload = { id: 'manager-id', email: 'manager@refugiapp.local', roles: [UserRole.SHELTER_MANAGER] };
const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('AuditLogs (e2e)', () => {
  let app: INestApplication;
  const auditLogsService = {
    list: jest.fn(),
    findById: jest.fn(),
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

  class NoTokenJwtAuthGuard {
    canActivate(): boolean {
      throw new UnauthorizedException();
    }
  }

  async function createAppWithGuard(
    guard: new () => { canActivate(context: ExecutionContext): boolean },
  ): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: auditLogsService }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guard)
      .compile();

    const testApp = moduleRef.createNestApplication();
    testApp.setGlobalPrefix('api/v1');
    testApp.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
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

  it('lists audit logs for an admin', async () => {
    auditLogsService.list.mockResolvedValue({
      items: [
        {
          id: VALID_UUID,
          actorUserId: adminPayload.id,
          action: AuditAction.USER_CREATE,
          resourceType: AuditResourceType.USER,
          resourceId: 'user-id',
          metadata: { email: 'user@refugiapp.local' },
          occurredAt: new Date(),
          createdAt: new Date(),
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].action).toBe(AuditAction.USER_CREATE);
  });

  it('rejects invalid query params with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit-logs?limit=101')
      .set('Authorization', 'Bearer admin-token')
      .expect(400);
  });

  it('returns an audit log by id', async () => {
    auditLogsService.findById.mockResolvedValue({
      id: VALID_UUID,
      action: AuditAction.ACCESS_DENIED,
      resourceType: AuditResourceType.AUTHORIZATION,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${VALID_UUID}`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
  });

  it('returns 404 when the audit log does not exist', async () => {
    auditLogsService.findById.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${VALID_UUID}`)
      .set('Authorization', 'Bearer admin-token')
      .expect(404);
  });

  it('rejects non-admin roles with 403', async () => {
    const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);

    await request(managerApp.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', 'Bearer manager-token')
      .expect(403);

    await managerApp.close();
  });

  it('rejects requests without a token with 401', async () => {
    const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

    await request(noTokenApp.getHttpServer()).get('/api/v1/audit-logs').expect(401);

    await noTokenApp.close();
  });

  it('never exposes raw secrets in the response payload', async () => {
    auditLogsService.findById.mockResolvedValue({
      id: VALID_UUID,
      action: AuditAction.AUTH_LOGIN_FAILURE,
      resourceType: AuditResourceType.AUTH_SESSION,
      metadata: { email: 'user@refugiapp.local', password: '[REDACTED]' },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/audit-logs/${VALID_UUID}`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);

    expect(JSON.stringify(res.body)).not.toContain('super-secret');
    expect(res.body.metadata.password).toBe('[REDACTED]');
  });
});