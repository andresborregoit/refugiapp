import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableUuidOsspExtension1787000000000 implements MigrationInterface {
  name = 'EnableUuidOsspExtension1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // The extension is intentionally retained because UUID defaults in later
    // migrations may still depend on uuid_generate_v4().
  }
}
