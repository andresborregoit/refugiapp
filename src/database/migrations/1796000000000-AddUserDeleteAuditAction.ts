import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDeleteAuditAction1796000000000 implements MigrationInterface {
  name = 'AddUserDeleteAuditAction1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'user.delete'`);
  }

  public async down(): Promise<void> {
    // PostgreSQL does not support removing a value from an enum type.
    // The `user.delete` value is intentionally left in place on rollback,
    // consistent with previous audit_action additions.
  }
}
