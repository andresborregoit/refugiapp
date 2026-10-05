import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationSubscriptions1793000000000 implements MigrationInterface {
  name = 'AddNotificationSubscriptions1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'push.device_register'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'push.device_remove'`);
    await queryRunner.query(
      `ALTER TYPE "public"."audit_action" ADD VALUE 'push.preferences_update'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."audit_action" ADD VALUE 'push.dispatch_completed'`,
    );
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'push.token_invalid'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'notification'`);
    await queryRunner.query(`CREATE TYPE "public"."device_platform" AS ENUM('ios', 'android')`);
    await queryRunner.query(
      `CREATE TYPE "public"."notification_kind" AS ENUM('overdue', 'upcoming')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notification_delivery_status" AS ENUM('queued', 'sent', 'skipped', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "device_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expoPushToken" character varying(255) NOT NULL, "tokenSuffix" character varying(12) NOT NULL, "platform" "public"."device_platform" NOT NULL, "timezone" character varying(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires', "appVersion" character varying(32), "isActive" boolean NOT NULL DEFAULT true, "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_device_subscriptions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_device_subscriptions_tokenHash" ON "device_subscriptions" ("tokenHash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_device_subscriptions_userId" ON "device_subscriptions" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("userId" uuid NOT NULL, "overdueEnabled" boolean NOT NULL DEFAULT true, "upcomingEnabled" boolean NOT NULL DEFAULT true, "upcomingWindowMinutes" integer NOT NULL DEFAULT 60, "quietStart" TIME, "quietEnd" TIME, "timezone" character varying(64) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires', "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "CHK_notification_preferences_window" CHECK ("upcomingWindowMinutes" >= 5 AND "upcomingWindowMinutes" <= 1440), CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("userId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "dedupKey" character varying(180) NOT NULL, "userId" uuid NOT NULL, "careTaskId" uuid NOT NULL, "kind" "public"."notification_kind" NOT NULL, "dueAtSnapshot" TIMESTAMP WITH TIME ZONE, "status" "public"."notification_delivery_status" NOT NULL DEFAULT 'queued', "providerReceiptId" character varying(160), "attemptCount" integer NOT NULL DEFAULT 0, "lastErrorCode" character varying(64), CONSTRAINT "UQ_notification_deliveries_dedupKey" UNIQUE ("dedupKey"), CONSTRAINT "PK_notification_deliveries" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_deliveries_taskKind" ON "notification_deliveries" ("careTaskId", "kind") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notification_deliveries_statusCreated" ON "notification_deliveries" ("status", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "device_subscriptions" ADD CONSTRAINT "FK_device_subscriptions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" ADD CONSTRAINT "FK_notification_deliveries_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" ADD CONSTRAINT "FK_notification_deliveries_task" FOREIGN KEY ("careTaskId") REFERENCES "care_tasks"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" DROP CONSTRAINT "FK_notification_deliveries_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_deliveries" DROP CONSTRAINT "FK_notification_deliveries_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_notification_preferences_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "device_subscriptions" DROP CONSTRAINT "FK_device_subscriptions_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_deliveries_statusCreated"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notification_deliveries_taskKind"`);
    await queryRunner.query(`DROP TABLE "notification_deliveries"`);
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_subscriptions_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_subscriptions_tokenHash"`);
    await queryRunner.query(`DROP TABLE "device_subscriptions"`);
    await queryRunner.query(`DROP TYPE "public"."notification_delivery_status"`);
    await queryRunner.query(`DROP TYPE "public"."notification_kind"`);
    await queryRunner.query(`DROP TYPE "public"."device_platform"`);
  }
}
