import { QueryRunner } from 'typeorm';
import { AddBreedToAnimals1788897600000 } from '../1788897600000-AddBreedToAnimals';

describe('AddBreedToAnimals1788897600000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddBreedToAnimals1788897600000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddBreedToAnimals1788897600000();
  });

  it('adds nullable breed to animals', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "animals" ADD "breed" character varying(80)`,
    );
  });

  it('removes breed from animals on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(
      `ALTER TABLE "animals" DROP COLUMN "breed"`,
    );
  });
});
