import { QueryRunner } from 'typeorm';
import { AddAuditLogs1789399460070 } from '../1789399460070-AddAuditLogs';

describe('AddAuditLogs1789399460070', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddAuditLogs1789399460070;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddAuditLogs1789399460070();
  });

  it('creates the audit types, table, indexes and foreign key without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain('CREATE TYPE "public"."audit_action"');
    expect(statements).toContain('CREATE TYPE "public"."audit_resource_type"');
    expect(statements).toContain('CREATE TABLE "audit_logs"');
    expect(statements).toContain('CREATE INDEX');
    expect(statements).toContain(
      'FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL',
    );
    expect(statements).not.toMatch(/\bDROP TABLE\b/i);
    expect(statements).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('drops the table and types on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain('DROP TABLE "audit_logs"');
    expect(statements).toContain('DROP TYPE "public"."audit_action"');
    expect(statements).toContain('DROP TYPE "public"."audit_resource_type"');
  });
});