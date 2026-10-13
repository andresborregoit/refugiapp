import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnimalDeleteAuditAction1798000000000 implements MigrationInterface {
  name = 'AddAnimalDeleteAuditAction1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'animal.delete'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'animal'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing a value from an enum type.
    // The `animal.delete` action and `animal` resource type are intentionally
    // left in place on rollback, consistent with previous audit_action /
    // audit_resource_type additions.
  }
}
