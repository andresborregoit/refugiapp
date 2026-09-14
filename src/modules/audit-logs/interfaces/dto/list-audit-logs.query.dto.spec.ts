import { validate } from 'class-validator';
import { AuditAction } from '../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../domain/enums/audit-resource-type.enum';
import { ListAuditLogsQueryDto } from './list-audit-logs.query.dto';

describe('ListAuditLogsQueryDto', () => {
  function createDto(overrides: Partial<ListAuditLogsQueryDto> = {}): ListAuditLogsQueryDto {
    return Object.assign(new ListAuditLogsQueryDto(), { page: 1, limit: 20, ...overrides });
  }

  it('accepts defaults', async () => {
    expect(await validate(createDto())).toHaveLength(0);
  });

  it('accepts valid filters', async () => {
    const errors = await validate(
      createDto({
        action: AuditAction.USER_CREATE,
        resourceType: AuditResourceType.USER,
        resourceId: '11111111-1111-4111-8111-111111111111',
        actorUserId: '22222222-2222-4222-8222-222222222222',
      }),
    );

    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid action', async () => {
    const errors = await validate(createDto({ action: 'nope' as AuditAction }));

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'action' })]),
    );
  });

  it('rejects a limit above 100', async () => {
    const errors = await validate(createDto({ limit: 101 }));

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'limit' })]),
    );
  });

  it('rejects a non-uuid resourceId', async () => {
    const errors = await validate(createDto({ resourceId: 'not-a-uuid' }));

    expect(errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'resourceId' })]),
    );
  });
});