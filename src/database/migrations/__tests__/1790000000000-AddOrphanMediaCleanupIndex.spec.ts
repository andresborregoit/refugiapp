import { QueryRunner } from 'typeorm';
import { AddOrphanMediaCleanupIndex1790000000000 } from '../1790000000000-AddOrphanMediaCleanupIndex';

describe('AddOrphanMediaCleanupIndex1790000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddOrphanMediaCleanupIndex1790000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddOrphanMediaCleanupIndex1790000000000();
  });

  it('creates a partial index for active orphan assets', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledTimes(1);
    const statement = queryRunner.query.mock.calls[0]![0] as string;
    expect(statement).toContain('CREATE INDEX "IDX_media_assets_orphan_cleanup"');
    expect(statement).toContain('"createdAt", "id"');
    expect(statement).toContain(
      'WHERE "ownerType" IS NULL AND "ownerId" IS NULL AND "deletedAt" IS NULL',
    );
    expect(statement).not.toMatch(/\bDROP\b/i);
  });

  it('drops the index on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      `DROP INDEX "IDX_media_assets_orphan_cleanup"`,
    );
  });
});