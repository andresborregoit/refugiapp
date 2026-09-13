import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowOrphanMediaAssets1789300000000 implements MigrationInterface {
  name = 'AllowOrphanMediaAssets1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerType" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerType" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerId" SET NOT NULL`,
    );
  }
}