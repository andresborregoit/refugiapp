import { QueryRunner } from 'typeorm';
import { EnableUuidOsspExtension1787000000000 } from '../1787000000000-EnableUuidOsspExtension';

describe('EnableUuidOsspExtension1787000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: EnableUuidOsspExtension1787000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new EnableUuidOsspExtension1787000000000();
  });

  it('enables uuid-ossp before UUID-backed tables are created', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).toHaveBeenCalledWith(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  });

  it('retains the shared extension on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});
