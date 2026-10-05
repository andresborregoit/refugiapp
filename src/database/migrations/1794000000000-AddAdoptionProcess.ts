import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdoptionProcess1794000000000 implements MigrationInterface {
  name = 'AddAdoptionProcess1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'adopter.create'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'adoption_application.create'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_action" ADD VALUE 'adoption.complete'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'adopter'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'adoption_application'`);
    await queryRunner.query(`ALTER TYPE "public"."audit_resource_type" ADD VALUE 'adoption'`);
    await queryRunner.query(`CREATE TYPE "public"."adoption_application_status" AS ENUM('pending', 'approved', 'rejected')`);
    await queryRunner.query(`CREATE TABLE "adopters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "email" character varying(320) NOT NULL, "phone" character varying(32) NOT NULL, "address" character varying(255), CONSTRAINT "PK_adopters" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_adopters_email" ON "adopters" ("email")`);
    await queryRunner.query(`CREATE TABLE "adoption_applications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "adopterId" uuid NOT NULL, "status" "public"."adoption_application_status" NOT NULL DEFAULT 'pending', "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdByUserId" uuid, "decidedAt" TIMESTAMP WITH TIME ZONE, "decidedByUserId" uuid, CONSTRAINT "PK_adoption_applications" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_adoption_applications_animalId" ON "adoption_applications" ("animalId")`);
    await queryRunner.query(`CREATE INDEX "IDX_adoption_applications_adopterId" ON "adoption_applications" ("adopterId")`);
    await queryRunner.query(`CREATE INDEX "IDX_adoption_applications_status" ON "adoption_applications" ("status")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_adoption_applications_pending" ON "adoption_applications" ("animalId", "adopterId") WHERE "status" = 'pending' AND "deletedAt" IS NULL`);
    await queryRunner.query(`CREATE TABLE "adoptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "adopterId" uuid NOT NULL, "applicationId" uuid NOT NULL, "adoptedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "responsibleUserId" uuid, CONSTRAINT "PK_adoptions" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_adoptions_animalId" ON "adoptions" ("animalId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_adoptions_applicationId" ON "adoptions" ("applicationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_adoptions_adoptedAt" ON "adoptions" ("adoptedAt")`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" ADD CONSTRAINT "FK_adoption_applications_animal" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" ADD CONSTRAINT "FK_adoption_applications_adopter" FOREIGN KEY ("adopterId") REFERENCES "adopters"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" ADD CONSTRAINT "FK_adoption_applications_createdBy" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" ADD CONSTRAINT "FK_adoption_applications_decidedBy" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoptions" ADD CONSTRAINT "FK_adoptions_animal" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoptions" ADD CONSTRAINT "FK_adoptions_adopter" FOREIGN KEY ("adopterId") REFERENCES "adopters"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoptions" ADD CONSTRAINT "FK_adoptions_application" FOREIGN KEY ("applicationId") REFERENCES "adoption_applications"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "adoptions" ADD CONSTRAINT "FK_adoptions_responsible" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "adoptions" DROP CONSTRAINT "FK_adoptions_responsible"`);
    await queryRunner.query(`ALTER TABLE "adoptions" DROP CONSTRAINT "FK_adoptions_application"`);
    await queryRunner.query(`ALTER TABLE "adoptions" DROP CONSTRAINT "FK_adoptions_adopter"`);
    await queryRunner.query(`ALTER TABLE "adoptions" DROP CONSTRAINT "FK_adoptions_animal"`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" DROP CONSTRAINT "FK_adoption_applications_decidedBy"`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" DROP CONSTRAINT "FK_adoption_applications_createdBy"`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" DROP CONSTRAINT "FK_adoption_applications_adopter"`);
    await queryRunner.query(`ALTER TABLE "adoption_applications" DROP CONSTRAINT "FK_adoption_applications_animal"`);
    await queryRunner.query(`DROP TABLE "adoptions"`);
    await queryRunner.query(`DROP TABLE "adoption_applications"`);
    await queryRunner.query(`DROP TABLE "adopters"`);
    await queryRunner.query(`DROP TYPE "public"."adoption_application_status"`);
  }
}
