import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrphanMediaCleanupIndex1790000000000 implements MigrationInterface {
  name = 'AddOrphanMediaCleanupIndex1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_media_assets_orphan_cleanup" ON "media_assets" ("createdAt", "id") WHERE "ownerType" IS NULL AND "ownerId" IS NULL AND "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_media_assets_orphan_cleanup"`);
  }
}