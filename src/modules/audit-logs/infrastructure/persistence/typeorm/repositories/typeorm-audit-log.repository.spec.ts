import { Repository } from 'typeorm';
import { CreateAuditLog } from '../../../../domain/entities/create-audit-log.entity';
import { AuditAction } from '../../../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../../domain/enums/audit-resource-type.enum';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';
import { TypeOrmAuditLogRepository } from './typeorm-audit-log.repository';

describe('TypeOrmAuditLogRepository', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    delete: jest.Mock;
  };
  let auditLogRepository: TypeOrmAuditLogRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      create: jest.fn().mockImplementation((data: object) => data),
      save: jest.fn().mockImplementation(async (entity: { id?: string }) => {
        if (!entity.id) {
          entity.id = 'generated-audit-id';
        }
        return entity;
      }),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    auditLogRepository = new TypeOrmAuditLogRepository(
      repository as unknown as Repository<AuditLogOrmEntity>,
    );
  });

  describe('save', () => {
    it('persists and maps to the domain entity', async () => {
      const input = new CreateAuditLog(
        'actor-id',
        AuditAction.USER_CREATE,
        AuditResourceType.USER,
        'user-id',
        { email: 'user@refugiapp.local' },
        now,
      );

      const result = await auditLogRepository.save(input);

      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        actorUserId: 'actor-id',
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        resourceId: 'user-id',
      });
    });
  });

  describe('findMany', () => {
    it('filters, orders and paginates deterministically', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await auditLogRepository.findMany({ page: 2, limit: 10, action: AuditAction.USER_CREATE });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: AuditAction.USER_CREATE },
          order: { occurredAt: 'DESC', id: 'DESC' },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('applies the date range filter', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);
      const from = new Date('2026-03-01T00:00:00.000Z');
      const to = new Date('2026-03-31T00:00:00.000Z');

      await auditLogRepository.findMany({ page: 1, limit: 20, from, to });

      const where = repository.findAndCount.mock.calls[0]![0].where;
      expect(where.occurredAt).toBeDefined();
    });
  });

  describe('purgeOlderThan', () => {
    it('hard deletes entries older than the threshold', async () => {
      const threshold = new Date('2024-03-10T00:00:00.000Z');

      const affected = await auditLogRepository.purgeOlderThan(threshold);

      expect(affected).toBe(2);
      expect(repository.delete).toHaveBeenCalledTimes(1);
    });
  });
});