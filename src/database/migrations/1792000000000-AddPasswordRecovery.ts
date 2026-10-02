import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordRecovery1792000000000 implements MigrationInterface {
  name = 'AddPasswordRecovery1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.password_change'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.password_reset_requested'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.password_reset_completed'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.password_reset_failed'`);
    await queryRunner.query(`CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_password_reset_tokens_tokenHash" ON "password_reset_tokens" ("tokenHash")`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_userId" ON "password_reset_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_password_reset_tokens_expiresAt" ON "password_reset_tokens" ("expiresAt")`);
    await queryRunner.query(`ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_password_reset_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_password_reset_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_expiresAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_password_reset_tokens_tokenHash"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
  }
}
