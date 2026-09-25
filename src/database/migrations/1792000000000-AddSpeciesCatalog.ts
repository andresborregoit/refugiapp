import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpeciesCatalog1792000000000 implements MigrationInterface {
  name = 'AddSpeciesCatalog1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "species" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "slug" character varying(80) NOT NULL, "labelEs" character varying(120) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_species" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_species_slug" ON "species" ("slug") `);
    await queryRunner.query(`CREATE INDEX "IDX_species_sortOrder" ON "species" ("sortOrder") `);
    await queryRunner.query(`CREATE TABLE "breeds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "speciesId" uuid NOT NULL, "slug" character varying(80) NOT NULL, "labelEs" character varying(120) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_breeds" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_breeds_speciesId_slug" ON "breeds" ("speciesId", "slug") `);
    await queryRunner.query(`CREATE INDEX "IDX_breeds_speciesId_labelEs" ON "breeds" ("speciesId", "labelEs") `);
    await queryRunner.query(`ALTER TABLE "breeds" ADD CONSTRAINT "FK_breeds_species" FOREIGN KEY ("speciesId") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);

    await queryRunner.query(`INSERT INTO "species" ("slug", "labelEs", "isActive", "sortOrder") VALUES ('dog', 'Perro', true, 10), ('cat', 'Gato', true, 20), ('rabbit', 'Conejo', true, 30), ('bird', 'Ave', true, 40), ('other', 'Otro', true, 999) ON CONFLICT ("slug") DO NOTHING`);

    await queryRunner.query(`INSERT INTO "breeds" ("speciesId", "slug", "labelEs", "isActive") SELECT s.id, b.slug, b."labelEs", true FROM "species" s JOIN (VALUES ('dog', 'mestizo', 'Mestizo'), ('dog', 'labrador-retriever', 'Labrador retriever'), ('dog', 'pastor-aleman', 'Pastor alemán'), ('dog', 'bulldog', 'Bulldog'), ('dog', 'caniche', 'Caniche'), ('dog', 'beagle', 'Beagle'), ('dog', 'golden-retriever', 'Golden retriever'), ('dog', 'other', 'Otra'), ('cat', 'mestizo', 'Mestizo'), ('cat', 'siames', 'Siamés'), ('cat', 'persa', 'Persa'), ('cat', 'bengali', 'Bengalí'), ('cat', 'british-shorthair', 'British shorthair'), ('cat', 'other', 'Otra'), ('rabbit', 'mestizo', 'Mestizo'), ('rabbit', 'miniatura', 'Miniatura'), ('rabbit', 'holandes-lop', 'Holandés lop'), ('rabbit', 'angora', 'Angora'), ('rabbit', 'other', 'Otra'), ('bird', 'periquito', 'Periquito'), ('bird', 'canario', 'Canario'), ('bird', 'agapornis', 'Agapornis'), ('bird', 'loro', 'Loro'), ('bird', 'other', 'Otra')) AS b(species_slug, slug, "labelEs") ON b.species_slug = s.slug ON CONFLICT ("speciesId", "slug") DO NOTHING`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "breeds" DROP CONSTRAINT "FK_breeds_species"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_breeds_speciesId_labelEs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_breeds_speciesId_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_species_sortOrder"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_species_slug"`);
    await queryRunner.query(`DROP TABLE "breeds"`);
    await queryRunner.query(`DROP TABLE "species"`);
  }
}