import { QueryRunner } from 'typeorm';
import { AddAdoptionProcess1794000000000 } from '../1794000000000-AddAdoptionProcess';

describe('AddAdoptionProcess1794000000000', () => {
  const query = jest.fn();
  const queryRunner = { query };
  const migration = new AddAdoptionProcess1794000000000();

  beforeEach(() => query.mockReset());

  it('creates adoption tables, constraints, indexes and audit values', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(sql).toContain(`ADD VALUE 'adoption.complete'`);
    expect(sql).toContain('CREATE TABLE "adopters"');
    expect(sql).toContain('CREATE TABLE "adoption_applications"');
    expect(sql).toContain('CREATE TABLE "adoptions"');
    expect(sql).toContain('CREATE UNIQUE INDEX "IDX_adoption_applications_pending"');
    expect(sql).toContain('FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL');
  });

  it('removes adoption tables and its domain enum on rollback', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);
    const sql = query.mock.calls.map(([statement]) => statement as string).join('\n');
    expect(sql).toContain('DROP TABLE "adoptions"');
    expect(sql).toContain('DROP TYPE "public"."adoption_application_status"');
  });
});
