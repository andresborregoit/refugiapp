import { QueryRunner } from 'typeorm';
import { AddUserDeleteAuditAction1796000000000 } from '../1796000000000-AddUserDeleteAuditAction';

describe('AddUserDeleteAuditAction1796000000000', () => {
  const query = jest.fn();
  const queryRunner = { query };
  const migration = new AddUserDeleteAuditAction1796000000000();

  beforeEach(() => query.mockReset());

  it('adds the user.delete value to the audit_action enum', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(sql).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'user.delete'`);
  });

  it('leaves the enum value in place on rollback', async () => {
    await migration.down();

    expect(query).not.toHaveBeenCalled();
  });
});
