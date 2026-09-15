import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBreedToAnimals1788897600000 implements MigrationInterface {
  name = 'AddBreedToAnimals1788897600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "animals" ADD "breed" character varying(80)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "animals" DROP COLUMN "breed"`);
  }
}
