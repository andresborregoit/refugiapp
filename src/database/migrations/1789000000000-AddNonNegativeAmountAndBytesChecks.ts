import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNonNegativeAmountAndBytesChecks1789000000000
  implements MigrationInterface
{
  name = 'AddNonNegativeAmountAndBytesChecks1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "CHK_expenses_amountCents_non_negative" CHECK ("amountCents" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" ADD CONSTRAINT "CHK_media_assets_bytes_non_negative" CHECK ("bytes" IS NULL OR "bytes" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "CHK_media_assets_bytes_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "CHK_expenses_amountCents_non_negative"`,
    );
  }
}
