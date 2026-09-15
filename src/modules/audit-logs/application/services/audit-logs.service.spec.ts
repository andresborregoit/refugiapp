import { BadRequestException } from '@nestjs/common';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { AuditAction } from '../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../domain/enums/audit-resource-type.enum';
import { AuditLogsService } from './audit-logs.service';

describe('AuditLogsService', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');
  const auditLog = new AuditLog(
    'audit-id',
    'actor-id',
    AuditAction.USER_CREATE,
    AuditResourceType.USER,
    'user-id',
    now,
    { email: 'user@refugiapp.local' },
    now,
    now,
  );
  const auditLogRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    purgeOlderThan: jest.fn(),
  };
  let service: AuditLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuditLogsService(auditLogRepository as any);
  });

  describe('record', () => {
    it('sanitizes metadata before persisting', async () => {
      auditLogRepository.save.mockResolvedValue(auditLog);

      await service.record({
        actorUserId: 'actor-id',
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        resourceId: 'user-id',
        metadata: { password: 'secret', email: 'user@refugiapp.local' },
      });

      const savedInput = auditLogRepository.save.mock.calls[0]![0];
      expect(savedInput.metadata).toEqual({ password: '[REDACTED]', email: 'user@refugiapp.local' });
    });

    it('defaults optional fields to null', async () => {
      auditLogRepository.save.mockResolvedValue(auditLog);

      await service.record({
        action: AuditAction.AUTH_LOGIN_FAILURE,
        resourceType: AuditResourceType.AUTH_SESSION,
      });

      const savedInput = auditLogRepository.save.mock.calls[0]![0];
      expect(savedInput.actorUserId).toBeNull();
      expect(savedInput.resourceId).toBeNull();
    });
  });

  describe('list', () => {
    it('throws INVALID_DATE_RANGE when from is after to', async () => {
      await expect(
        service.list({ page: 1, limit: 20, from: '2026-04-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
      expect(auditLogRepository.findMany).not.toHaveBeenCalled();
    });

    it('maps the query to repository filters', async () => {
      auditLogRepository.findMany.mockResolvedValue({ items: [auditLog], page: 1, limit: 20, total: 1 });

      await service.list({ page: 1, limit: 20, action: AuditAction.USER_CREATE });

      expect(auditLogRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, action: AuditAction.USER_CREATE }),
      );
    });
  });

  describe('purgeExpired', () => {
    it('purges entries older than the retention window', async () => {
      auditLogRepository.purgeOlderThan.mockResolvedValue(3);

      const purged = await service.purgeExpired(now);

      expect(purged).toBe(3);
      const threshold = auditLogRepository.purgeOlderThan.mock.calls[0]![0] as Date;
      expect(threshold.getTime()).toBeLessThan(now.getTime());
    });
  });
});