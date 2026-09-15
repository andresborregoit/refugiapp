import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditLogs1789399460070 implements MigrationInterface {
    name = 'AddAuditLogs1789399460070'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."audit_action" AS ENUM('user.create', 'user.deactivate', 'user.activate', 'user.role_assign', 'medical_record.create', 'medical_record.update', 'medical_record.soft_delete', 'medical_record.restore', 'expense.create', 'expense.soft_delete', 'auth.login_success', 'auth.login_failure', 'access.denied')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_resource_type" AS ENUM('user', 'medical_record', 'expense', 'auth_session', 'authorization')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "actorUserId" uuid, "action" "public"."audit_action" NOT NULL, "resourceType" "public"."audit_resource_type" NOT NULL, "resourceId" uuid, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs"  ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_48abb73a684410b7bf679c24c1" ON "audit_logs"  ("occurredAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_e36d23e1e7cf81ea77758bef79" ON "audit_logs"  ("actorUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8e229d453b21312155c6ab8cfd" ON "audit_logs"  ("resourceType", "resourceId") `);
        await queryRunner.query(`ALTER TABLE "media_assets" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "medical_record_changes" ALTER COLUMN "previousValues" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_e36d23e1e7cf81ea77758bef795"`);
        await queryRunner.query(`ALTER TABLE "medical_record_changes" ALTER COLUMN "previousValues" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "media_assets" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8e229d453b21312155c6ab8cfd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e36d23e1e7cf81ea77758bef79"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48abb73a684410b7bf679c24c1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_resource_type"`);
        await queryRunner.query(`DROP TYPE "public"."audit_action"`);
    }

}
