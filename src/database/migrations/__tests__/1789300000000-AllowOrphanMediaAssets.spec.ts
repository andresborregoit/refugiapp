import { QueryRunner } from 'typeorm';
import { AllowOrphanMediaAssets1789300000000 } from '../1789300000000-AllowOrphanMediaAssets';

describe('AllowOrphanMediaAssets1789300000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AllowOrphanMediaAssets1789300000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AllowOrphanMediaAssets1789300000000();
  });

  it('drops NOT NULL on owner columns without drops of columns', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerType" DROP NOT NULL`,
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerId" DROP NOT NULL`,
    );
    expect(queryRunner.query.mock.calls.flat().join(' ')).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('restores NOT NULL on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerType" SET NOT NULL`,
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      `ALTER TABLE "media_assets" ALTER COLUMN "ownerId" SET NOT NULL`,
    );
  });
});