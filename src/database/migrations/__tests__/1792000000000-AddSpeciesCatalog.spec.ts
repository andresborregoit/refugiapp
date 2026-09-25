import { QueryRunner } from 'typeorm';
import { AddSpeciesCatalog1792000000000 } from '../1792000000000-AddSpeciesCatalog';

describe('AddSpeciesCatalog1792000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddSpeciesCatalog1792000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddSpeciesCatalog1792000000000();
  });

  it('creates the catalog tables and idempotent seeds without drops', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain(`CREATE TABLE "species"`);
    expect(statements).toContain(`CREATE UNIQUE INDEX "IDX_species_slug" ON "species" ("slug")`);
    expect(statements).toContain(`CREATE INDEX "IDX_species_sortOrder" ON "species" ("sortOrder")`);
    expect(statements).toContain(`CREATE TABLE "breeds"`);
    expect(statements).toContain(
      `CREATE UNIQUE INDEX "IDX_breeds_speciesId_slug" ON "breeds" ("speciesId", "slug")`,
    );
    expect(statements).toContain(
      `CREATE INDEX "IDX_breeds_speciesId_labelEs" ON "breeds" ("speciesId", "labelEs")`,
    );
    expect(statements).toContain(
      `FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT`,
    );
    expect(statements).toContain(`'dog', 'Perro', true, 10`);
    expect(statements).toContain(`ON CONFLICT ("slug") DO NOTHING`);
    expect(statements).toContain(`'labrador-retriever', 'Labrador retriever'`);
    expect(statements).toContain(`ON CONFLICT ("speciesId", "slug") DO NOTHING`);
    expect(statements).not.toMatch(/\bDROP TABLE\b/i);
    expect(statements).not.toMatch(/\bDROP COLUMN\b/i);
  });

  it('drops the catalog tables on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const statements = queryRunner.query.mock.calls.map((call) => String(call[0])).join(' ');

    expect(statements).toContain(`ALTER TABLE "breeds" DROP CONSTRAINT "FK_breeds_species"`);
    expect(statements).toContain('DROP TABLE "breeds"');
    expect(statements).toContain('DROP TABLE "species"');
  });
});