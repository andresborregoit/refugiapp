import { QueryRunner } from 'typeorm';
import { AddNonNegativeAmountAndBytesChecks1789000000000 } from '../1789000000000-AddNonNegativeAmountAndBytesChecks';

describe('AddNonNegativeAmountAndBytesChecks1789000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddNonNegativeAmountAndBytesChecks1789000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddNonNegativeAmountAndBytesChecks1789000000000();
  });

  it('adds non-negative checks without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      `ALTER TABLE "expenses" ADD CONSTRAINT "CHK_expenses_amountCents_non_negative" CHECK ("amountCents" >= 0)`,
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      `ALTER TABLE "media_assets" ADD CONSTRAINT "CHK_media_assets_bytes_non_negative" CHECK ("bytes" IS NULL OR "bytes" >= 0)`,
    );
    expect(queryRunner.query.mock.calls.flat().join(' ')).not.toMatch(/\bDROP\b/i);
  });

  it('removes only the added checks on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenNthCalledWith(
      1,
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_bytes_non_negative"`,
    );
    expect(queryRunner.query).toHaveBeenNthCalledWith(
      2,
      `ALTER TABLE "expenses" DROP CONSTRAINT "CHK_expenses_amountCents_non_negative"`,
    );
  });
});
