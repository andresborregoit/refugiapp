import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokens1791000000001 implements MigrationInterface {
  name = 'AddRefreshTokens1791000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.refresh_success'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'auth.refresh_failure'`);
    await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid NOT NULL, "familyId" uuid NOT NULL, "tokenHash" character varying(64) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revokedAt" TIMESTAMP WITH TIME ZONE, "replacedById" uuid, CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_refresh_tokens_tokenHash" ON "refresh_tokens" ("tokenHash") `);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_familyId" ON "refresh_tokens" ("familyId") `);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_refresh_tokens_expiresAt" ON "refresh_tokens" ("expiresAt") `);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_refresh_tokens_replacedBy" FOREIGN KEY ("replacedById") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_replacedBy"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_expiresAt"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_userId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_familyId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_refresh_tokens_tokenHash"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'auth.refresh_failure'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" DROP VALUE 'auth.refresh_success'`);
  }
}