import { QueryRunner } from 'typeorm';
import { AddPasswordRecovery1792000000000 } from '../1792000000000-AddPasswordRecovery';

describe('AddPasswordRecovery1792000000000', () => {
  const query = jest.fn();
  const queryRunner = { query };
  const migration = new AddPasswordRecovery1792000000000();

  beforeEach(() => query.mockReset());

  it('creates the single-use token table, indexes, foreign key, and audit actions', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');

    expect(sql).toContain(`ADD VALUE 'auth.password_change'`);
    expect(sql).toContain(`ADD VALUE 'auth.password_reset_requested'`);
    expect(sql).toContain(`ADD VALUE 'auth.password_reset_completed'`);
    expect(sql).toContain(`ADD VALUE 'auth.password_reset_failed'`);
    expect(sql).toContain('CREATE TABLE "password_reset_tokens"');
    expect(sql).toContain('CREATE UNIQUE INDEX "IDX_password_reset_tokens_tokenHash"');
    expect(sql).toContain('ON DELETE CASCADE');
  });

  it('drops the password reset token schema on rollback', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');

    expect(sql).toContain('DROP TABLE "password_reset_tokens"');
  });
});
