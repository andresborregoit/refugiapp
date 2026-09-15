import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMedicalRecordChanges1788925249222 implements MigrationInterface {
    name = 'AddMedicalRecordChanges1788925249222'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."medical_record_change_type" AS ENUM('update', 'soft_delete', 'restore')`);
        await queryRunner.query(`CREATE TABLE "medical_record_changes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "medicalRecordId" uuid NOT NULL, "changedByUserId" uuid, "changeType" "public"."medical_record_change_type" NOT NULL, "previousValues" jsonb NOT NULL DEFAULT '{}'::jsonb, "changedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_c16f1d4aeda9f4f7d41e4b56710" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_82fd5112136dc96d18b3fabbf7" ON "medical_record_changes"  ("changedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_c9d54d884507672a0f6a81ea81" ON "medical_record_changes"  ("medicalRecordId") `);
        await queryRunner.query(`ALTER TABLE "media_assets" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb`);
        await queryRunner.query(`ALTER TABLE "medical_record_changes" ADD CONSTRAINT "FK_c9d54d884507672a0f6a81ea815" FOREIGN KEY ("medicalRecordId") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "medical_record_changes" ADD CONSTRAINT "FK_08ac16c6d8f99e292ff45ad6039" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medical_record_changes" DROP CONSTRAINT "FK_08ac16c6d8f99e292ff45ad6039"`);
        await queryRunner.query(`ALTER TABLE "medical_record_changes" DROP CONSTRAINT "FK_c9d54d884507672a0f6a81ea815"`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "media_assets" ALTER COLUMN "metadata" SET DEFAULT '{}'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c9d54d884507672a0f6a81ea81"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_82fd5112136dc96d18b3fabbf7"`);
        await queryRunner.query(`DROP TABLE "medical_record_changes"`);
        await queryRunner.query(`DROP TYPE "public"."medical_record_change_type"`);
    }

}
