import { QueryRunner } from 'typeorm';
import { AddAnimalDeleteAuditAction1798000000000 } from '../1798000000000-AddAnimalDeleteAuditAction';

describe('AddAnimalDeleteAuditAction1798000000000', () => {
  const query = jest.fn();
  const queryRunner = { query };
  const migration = new AddAnimalDeleteAuditAction1798000000000();

  beforeEach(() => query.mockReset());

  it('adds the animal.delete action and animal resource type to their enums', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(sql).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'animal.delete'`);
    expect(sql).toContain(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'animal'`);
  });

  it('leaves the enum values in place on rollback', async () => {
    await migration.down();

    expect(query).not.toHaveBeenCalled();
  });
});
