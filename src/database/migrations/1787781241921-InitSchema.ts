import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1787781241921 implements MigrationInterface {
    name = 'InitSchema1787781241921'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_role" AS ENUM('admin', 'shelter_manager', 'veterinarian')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "email" character varying(320) NOT NULL, "passwordHash" character varying(255) NOT NULL, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "roles" "public"."user_role" array NOT NULL DEFAULT '{shelter_manager}', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."media_owner_type" AS ENUM('animal', 'expense_ticket', 'medical_record', 'user', 'veterinarian')`);
        await queryRunner.query(`CREATE TYPE "public"."media_resource_type" AS ENUM('image', 'video', 'raw')`);
        await queryRunner.query(`CREATE TABLE "media_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "ownerType" "public"."media_owner_type" NOT NULL, "ownerId" uuid NOT NULL, "resourceType" "public"."media_resource_type" NOT NULL DEFAULT 'image', "cloudinaryPublicId" character varying(255) NOT NULL, "secureUrl" character varying(2048) NOT NULL, "format" character varying(40), "bytes" integer, "uploadedByUserId" uuid, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_ca47e9f67a5e5d8af1e75d66ee6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_220bebf04aba028feab742517c" ON "media_assets"  ("cloudinaryPublicId") `);
        await queryRunner.query(`CREATE INDEX "IDX_cb74faa643e7c9b5d8f79edcae" ON "media_assets"  ("ownerType", "ownerId") `);
        await queryRunner.query(`CREATE TYPE "public"."animal_sex" AS ENUM('female', 'male', 'unknown')`);
        await queryRunner.query(`CREATE TYPE "public"."animal_status" AS ENUM('admitted', 'under_treatment', 'available_for_adoption', 'adopted', 'deceased')`);
        await queryRunner.query(`CREATE TABLE "animals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying(120) NOT NULL, "species" character varying(80) NOT NULL, "sex" "public"."animal_sex" NOT NULL DEFAULT 'unknown', "status" "public"."animal_status" NOT NULL DEFAULT 'admitted', "birthDate" date, "intakeDate" date NOT NULL, "profilePhotoMediaId" uuid, "notes" text, CONSTRAINT "PK_6154c334bbb19186788468bce5c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_76c52705ccdd4b5b833906de3b" ON "animals"  ("status") `);
        await queryRunner.query(`CREATE TYPE "public"."animal_history_event_type" AS ENUM('intake', 'transfer', 'status_change', 'behavior_note', 'adoption', 'general_note')`);
        await queryRunner.query(`CREATE TABLE "animal_history_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "eventType" "public"."animal_history_event_type" NOT NULL, "description" text NOT NULL, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdByUserId" uuid, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "PK_ca3cfe5cfaa900c2a1b9ffea7c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_150306da2aef16fa524f3d2379" ON "animal_history_events"  ("occurredAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_baf1d98e8df4b3da026f9ec855" ON "animal_history_events"  ("animalId") `);
        await queryRunner.query(`CREATE TYPE "public"."expense_category" AS ENUM('food', 'medicine', 'veterinary', 'supplies', 'transport', 'other')`);
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "category" "public"."expense_category" NOT NULL, "amountCents" integer NOT NULL, "currency" character(3) NOT NULL DEFAULT 'ARS', "description" character varying(180) NOT NULL, "ticketMediaId" uuid, "createdByUserId" uuid, "incurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_efd3d85a7dcc41cd85a85426f4" ON "expenses"  ("incurredAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_d29477f7710e455b3538eec37f" ON "expenses"  ("animalId") `);
        await queryRunner.query(`CREATE TABLE "veterinarians" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid, "firstName" character varying(100) NOT NULL, "lastName" character varying(100) NOT NULL, "licenseNumber" character varying(80) NOT NULL, "email" character varying(320), "phone" character varying(40), "notes" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a68520babb0d0d23dd052e8dc76" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b19946c9f80a4a02d031cc3f15" ON "veterinarians"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1bab8531b381146afb6dfd799d" ON "veterinarians"  ("licenseNumber") `);
        await queryRunner.query(`CREATE TYPE "public"."medical_record_type" AS ENUM('consultation', 'vaccination', 'deworming', 'surgery', 'lab_result', 'treatment', 'other')`);
        await queryRunner.query(`CREATE TABLE "medical_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "animalId" uuid NOT NULL, "veterinarianId" uuid, "recordType" "public"."medical_record_type" NOT NULL, "title" character varying(160) NOT NULL, "diagnosis" text, "treatment" text, "notes" text, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_c200c0b76638124b7ed51424823" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_15d0d16e3b4fb37d4b3603feb2" ON "medical_records"  ("occurredAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_3f5cc738ca6f46575512ae5a43" ON "medical_records"  ("animalId") `);
        await queryRunner.query(`ALTER TABLE "media_assets" ADD CONSTRAINT "FK_00196b8d916172158ef6d1e0225" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "animals" ADD CONSTRAINT "FK_2278d571f8c208c77f15ed5ef49" FOREIGN KEY ("profilePhotoMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ADD CONSTRAINT "FK_baf1d98e8df4b3da026f9ec855a" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" ADD CONSTRAINT "FK_dd69b5a404b18e6153fc1a7832f" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_d29477f7710e455b3538eec37fa" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_514ca32851f8c4ed657a315ec54" FOREIGN KEY ("ticketMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_c0a7c67f243fea2f1d7e3285a22" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "veterinarians" ADD CONSTRAINT "FK_b19946c9f80a4a02d031cc3f15b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "medical_records" ADD CONSTRAINT "FK_3f5cc738ca6f46575512ae5a438" FOREIGN KEY ("animalId") REFERENCES "animals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "medical_records" ADD CONSTRAINT "FK_fbea53deac705aa960eb26a2804" FOREIGN KEY ("veterinarianId") REFERENCES "veterinarians"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medical_records" DROP CONSTRAINT "FK_fbea53deac705aa960eb26a2804"`);
        await queryRunner.query(`ALTER TABLE "medical_records" DROP CONSTRAINT "FK_3f5cc738ca6f46575512ae5a438"`);
        await queryRunner.query(`ALTER TABLE "veterinarians" DROP CONSTRAINT "FK_b19946c9f80a4a02d031cc3f15b"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_c0a7c67f243fea2f1d7e3285a22"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_514ca32851f8c4ed657a315ec54"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_d29477f7710e455b3538eec37fa"`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" DROP CONSTRAINT "FK_dd69b5a404b18e6153fc1a7832f"`);
        await queryRunner.query(`ALTER TABLE "animal_history_events" DROP CONSTRAINT "FK_baf1d98e8df4b3da026f9ec855a"`);
        await queryRunner.query(`ALTER TABLE "animals" DROP CONSTRAINT "FK_2278d571f8c208c77f15ed5ef49"`);
        await queryRunner.query(`ALTER TABLE "media_assets" DROP CONSTRAINT "FK_00196b8d916172158ef6d1e0225"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f5cc738ca6f46575512ae5a43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_15d0d16e3b4fb37d4b3603feb2"`);
        await queryRunner.query(`DROP TABLE "medical_records"`);
        await queryRunner.query(`DROP TYPE "public"."medical_record_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1bab8531b381146afb6dfd799d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b19946c9f80a4a02d031cc3f15"`);
        await queryRunner.query(`DROP TABLE "veterinarians"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d29477f7710e455b3538eec37f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_efd3d85a7dcc41cd85a85426f4"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
        await queryRunner.query(`DROP TYPE "public"."expense_category"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_baf1d98e8df4b3da026f9ec855"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_150306da2aef16fa524f3d2379"`);
        await queryRunner.query(`DROP TABLE "animal_history_events"`);
        await queryRunner.query(`DROP TYPE "public"."animal_history_event_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76c52705ccdd4b5b833906de3b"`);
        await queryRunner.query(`DROP TABLE "animals"`);
        await queryRunner.query(`DROP TYPE "public"."animal_status"`);
        await queryRunner.query(`DROP TYPE "public"."animal_sex"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cb74faa643e7c9b5d8f79edcae"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_220bebf04aba028feab742517c"`);
        await queryRunner.query(`DROP TABLE "media_assets"`);
        await queryRunner.query(`DROP TYPE "public"."media_resource_type"`);
        await queryRunner.query(`DROP TYPE "public"."media_owner_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."user_role"`);
    }

}
