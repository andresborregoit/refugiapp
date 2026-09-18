import { QueryRunner } from 'typeorm';
import { AddCareTasks1791000000000 } from '../1791000000000-AddCareTasks';

describe('AddCareTasks1791000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddCareTasks1791000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddCareTasks1791000000000();
  });

  it('adds audit actions and creates the care task table without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.create'`);
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.update'`);
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.complete'`);
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.cancel'`);
    expect(statements).toContain(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'care_task'`);
    expect(statements).toContain(`CREATE TYPE "public"."care_task_status" AS ENUM('pending', 'completed', 'cancelled')`);
    expect(statements).toContain(`CREATE TABLE "care_tasks"`);
    expect(statements).toContain(`CREATE INDEX "IDX_care_tasks_animalId"`);
    expect(statements).toContain(`CREATE INDEX "IDX_care_tasks_status"`);
    expect(statements).toContain(`FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT`);
    expect(statements).toContain(`FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL`);
    expect(statements).not.toMatch(/\bDROP TABLE\b/i);
    expect(statements).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('drops the table and types on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain('DROP TABLE "care_tasks"');
    expect(statements).toContain('DROP TYPE "public"."care_task_status"');
    expect(statements).toContain(`ALTER TYPE "public"."audit_action" DROP VALUE 'care_task.create'`);
  });
});