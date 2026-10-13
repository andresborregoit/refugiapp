import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVeterinarianDeleteAuditAction1797000000000 implements MigrationInterface {
  name = 'AddVeterinarianDeleteAuditAction1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'veterinarian.delete'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'veterinarian'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing a value from an enum type.
    // The `veterinarian.delete` action and `veterinarian` resource type are
    // intentionally left in place on rollback, consistent with previous
    // audit_action / audit_resource_type additions.
  }
}
