import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfilePhoto1795000000000 implements MigrationInterface {
  name = 'AddUserProfilePhoto1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "profilePhotoMediaId" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_users_profilePhotoMediaId" ON "users" ("profilePhotoMediaId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_profilePhotoMediaId" FOREIGN KEY ("profilePhotoMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_profilePhotoMediaId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_users_profilePhotoMediaId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "profilePhotoMediaId"`);
  }
}
