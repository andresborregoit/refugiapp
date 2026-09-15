import { ForbiddenException } from '@nestjs/common';
import { AuditAction } from '../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../domain/enums/audit-resource-type.enum';
import { AuditForbiddenFilter } from './audit-forbidden.filter';

describe('AuditForbiddenFilter', () => {
  const auditLogsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const request = {
    method: 'GET',
    url: '/api/v1/users',
    route: { path: '/api/v1/users' },
    user: { id: 'actor-id', email: 'actor@refugiapp.local', roles: [] },
  };

  function createHost(overrides: Partial<typeof request> = {}): any {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ...request, ...overrides }),
        getResponse: () => response,
      }),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records an access.denied audit event with the authenticated actor', async () => {
    const filter = new AuditForbiddenFilter(auditLogsService as any);

    filter.catch(new ForbiddenException(), createHost());

    await new Promise((resolve) => setImmediate(resolve));

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'actor-id',
        action: AuditAction.ACCESS_DENIED,
        resourceType: AuditResourceType.AUTHORIZATION,
        metadata: expect.objectContaining({ method: 'GET', path: '/api/v1/users' }),
      }),
    );
  });

  it('falls back to a null actor when there is no authenticated user', async () => {
    const filter = new AuditForbiddenFilter(auditLogsService as any);

    filter.catch(new ForbiddenException(), createHost({ user: undefined }));

    await new Promise((resolve) => setImmediate(resolve));

    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null }),
    );
  });

  it('still writes the HTTP response when auditing fails', async () => {
    auditLogsService.record.mockRejectedValue(new Error('db down'));
    const filter = new AuditForbiddenFilter(auditLogsService as any);

    filter.catch(new ForbiddenException(), createHost());

    await new Promise((resolve) => setImmediate(resolve));

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalled();
  });
});