import { QueryRunner } from 'typeorm';
import { AddUserProfilePhoto1795000000000 } from '../1795000000000-AddUserProfilePhoto';

describe('AddUserProfilePhoto1795000000000', () => {
  let queryRunner: jest.Mocked<Pick<QueryRunner, 'query'>>;
  let migration: AddUserProfilePhoto1795000000000;

  beforeEach(() => {
    queryRunner = {
      query: jest.fn(),
    };
    migration = new AddUserProfilePhoto1795000000000();
  });

  it('adds a nullable profile photo reference with an index and a SET NULL foreign key', async () => {
    await migration.up(queryRunner as unknown as QueryRunner);

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement as string)
      .join('\n');

    expect(sql).toContain(`ALTER TABLE "users" ADD "profilePhotoMediaId" uuid`);
    expect(sql).toContain(
      `CREATE INDEX "IDX_users_profilePhotoMediaId" ON "users" ("profilePhotoMediaId")`,
    );
    expect(sql).toContain(
      `FOREIGN KEY ("profilePhotoMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL`,
    );
  });

  it('drops the constraint, index and column on revert', async () => {
    await migration.down(queryRunner as unknown as QueryRunner);

    const sql = queryRunner.query.mock.calls
      .map(([statement]) => statement as string)
      .join('\n');

    expect(sql).toContain(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_profilePhotoMediaId"`);
    expect(sql).toContain(`DROP INDEX "public"."IDX_users_profilePhotoMediaId"`);
    expect(sql).toContain(`ALTER TABLE "users" DROP COLUMN "profilePhotoMediaId"`);
  });
});
