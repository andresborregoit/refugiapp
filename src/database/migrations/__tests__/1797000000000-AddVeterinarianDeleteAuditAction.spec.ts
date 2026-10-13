import { QueryRunner } from 'typeorm';
import { AddVeterinarianDeleteAuditAction1797000000000 } from '../1797000000000-AddVeterinarianDeleteAuditAction';

describe('AddVeterinarianDeleteAuditAction1797000000000', () => {
  const query = jest.fn();
  const queryRunner = { query };
  const migration = new AddVeterinarianDeleteAuditAction1797000000000();

  beforeEach(() => query.mockReset());

  it('adds the veterinarian.delete action and veterinarian resource type to their enums', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(sql).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'veterinarian.delete'`);
    expect(sql).toContain(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'veterinarian'`);
  });

  it('leaves the enum values in place on rollback', async () => {
    await migration.down();

    expect(query).not.toHaveBeenCalled();
  });
});
