import { QueryRunner } from 'typeorm';
import { AddRefreshTokens1791000000001 } from '../1791000000001-AddRefreshTokens';

describe('AddRefreshTokens1791000000001', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddRefreshTokens1791000000001;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddRefreshTokens1791000000001();
  });

  it('adds refresh audit actions and creates the token table without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.refresh_success'`);
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.refresh_failure'`);
    expect(statements).toContain(`CREATE TABLE "refresh_tokens"`);
    expect(statements).toContain(`CREATE UNIQUE INDEX "IDX_refresh_tokens_tokenHash"`);
    expect(statements).toContain(`CREATE INDEX "IDX_refresh_tokens_familyId"`);
    expect(statements).toContain(`CREATE INDEX "IDX_refresh_tokens_userId"`);
    expect(statements).toContain(`CREATE INDEX "IDX_refresh_tokens_expiresAt"`);
    expect(statements).toContain(`FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT`);
    expect(statements).toContain(`FOREIGN KEY ("replacedById") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL`);
    expect(statements).not.toMatch(/\bDROP TABLE\b/i);
    expect(statements).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('drops the table and audit actions on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain('DROP TABLE "refresh_tokens"');
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" DROP VALUE 'auth.refresh_success'`);
  });
});