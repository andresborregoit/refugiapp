import { QueryRunner } from 'typeorm';
import { AddNotificationSubscriptions1793000000000 } from '../1793000000000-AddNotificationSubscriptions';

describe('AddNotificationSubscriptions1793000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddNotificationSubscriptions1793000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddNotificationSubscriptions1793000000000();
  });

  it('adds audit values and creates notification tables without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain(
      `ALTER TYPE "public"."audit_action" ADD VALUE 'push.device_register'`,
    );
    expect(statements).toContain(
      `ALTER TYPE "public"."audit_action" ADD VALUE 'push.token_invalid'`,
    );
    expect(statements).toContain(
      `ALTER TYPE "public"."audit_resource_type" ADD VALUE 'notification'`,
    );
    expect(statements).toContain(
      `CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android')`,
    );
    expect(statements).toContain(
      `CREATE TYPE "public"."notification_kind" AS ENUM('overdue', 'upcoming')`,
    );
    expect(statements).toContain(`CREATE TABLE "device_subscriptions"`);
    expect(statements).toContain(`CREATE TABLE "notification_preferences"`);
    expect(statements).toContain(`CREATE TABLE "notification_deliveries"`);
    expect(statements).toContain(
      `FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    expect(statements).toContain(
      `FOREIGN KEY ("careTaskId") REFERENCES "care_tasks"("id") ON DELETE RESTRICT`,
    );
    expect(statements).not.toMatch(/\bDROP TABLE\b/i);
    expect(statements).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('drops notification tables and types on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain('DROP TABLE "notification_deliveries"');
    expect(statements).toContain('DROP TABLE "notification_preferences"');
    expect(statements).toContain('DROP TABLE "device_subscriptions"');
    expect(statements).toContain('DROP TYPE "public"."device_platform"');
  });
});
