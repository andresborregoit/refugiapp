import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCareTasks1791000000000 implements MigrationInterface {
  name = 'AddCareTasks1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.create'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.update'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.complete'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'care_task.cancel'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'care_task'`);
    await queryRunner.query(`CREATE TYPE "public"."care_task_status" AS ENUM('pending', 'completed', 'cancelled')`);
    await queryRunner.query(`CREATE TABLE "care_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "title" character varying(160) NOT NULL, "description" text, "status" "public"."care_task_status" NOT NULL DEFAULT 'pending', "dueAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "createdByUserId" uuid, CONSTRAINT "PK_9b4d2e5c76a0d4e4c1e4f5c1a2b" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_care_tasks_animalId" ON "care_tasks" ("animalId") `);
    await queryRunner.query(`CREATE INDEX "IDX_care_tasks_status" ON "care_tasks" ("status") `);
    await queryRunner.query(`ALTER TABLE "care_tasks" ADD CONSTRAINT "FK_care_tasks_animal" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "care_tasks" ADD CONSTRAINT "FK_care_tasks_createdByUser" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "care_tasks" DROP CONSTRAINT "FK_care_tasks_createdByUser"`);
    await queryRunner.query(`ALTER TABLE "care_tasks" DROP CONSTRAINT "FK_care_tasks_animal"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_care_tasks_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_care_tasks_animalId"`);
    await queryRunner.query(`DROP TABLE "care_tasks"`);
    await queryRunner.query(`DROP TYPE "public"."care_task_status"`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" DROP VALUE 'care_task'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'care_task.cancel'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'care_task.complete'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'care_task.update'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'care_task.create'`);
  }
}