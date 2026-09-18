import { DataSource } from 'typeorm';
import { UserRole } from '../src/common/enums/user-role.enum';
import { ExpenseCategory } from '../src/modules/expenses/domain/enums/expense-category.enum';
import { AnimalOrmEntity } from '../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { ExpenseOrmEntity } from '../src/modules/expenses/infrastructure/persistence/typeorm/entities/expense.orm-entity';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import {
  buildTestDataSource,
  initializeWithMigrations,
  IsolatedPostgres,
  resetDatabase,
  startIsolatedPostgres,
} from './utils/persistence-test-setup';

interface ForeignKeyRow {
  table_name: string;
  column_name: string;
  foreign_table: string;
  delete_rule: string;
}

interface IndexRow {
  table_name: string;
  index_name: string;
  is_unique: boolean;
  columns: string[];
}

interface ColumnRow {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

const DOMAIN_TABLES = [
  'users',
  'veterinarians',
  'animals',
  'animal_history_events',
  'medical_records',
  'medical_record_changes',
  'expenses',
  'media_assets',
  'care_tasks',
  'refresh_tokens',
  'audit_logs',
];

describe('PostgreSQL schema contract (integration)', () => {
  let dataSource: DataSource;
  let postgres: IsolatedPostgres;

  beforeAll(async () => {
    postgres = await startIsolatedPostgres();
    dataSource = buildTestDataSource(postgres.url);
    await initializeWithMigrations(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await postgres.stop();
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  it('creates the expected PostgreSQL enums with the documented values', async () => {
    const rows: { name: string; value: string }[] = await dataSource.query(`
      SELECT t.typname AS name, e.enumlabel AS value
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder
    `);

    const enums: Record<string, string[]> = {};
    for (const row of rows) {
      (enums[row.name] ??= []).push(row.value);
    }

    expect(enums.user_role).toEqual(['admin', 'shelter_manager', 'veterinarian']);
    expect(enums.animal_sex).toEqual(['female', 'male', 'unknown']);
    expect(enums.animal_status).toEqual([
      'admitted',
      'under_treatment',
      'available_for_adoption',
      'adopted',
      'deceased',
    ]);
    expect(enums.animal_history_event_type).toEqual([
      'intake',
      'transfer',
      'status_change',
      'behavior_note',
      'adoption',
      'general_note',
    ]);
    expect(enums.medical_record_type).toEqual([
      'consultation',
      'vaccination',
      'deworming',
      'surgery',
      'lab_result',
      'treatment',
      'other',
    ]);
    expect(enums.medical_record_change_type).toEqual(['update', 'soft_delete', 'restore']);
    expect(enums.expense_category).toEqual([
      'food',
      'medicine',
      'veterinary',
      'supplies',
      'transport',
      'other',
    ]);
    expect(enums.media_owner_type).toEqual([
      'animal',
      'expense_ticket',
      'medical_record',
      'user',
      'veterinarian',
    ]);
    expect(enums.media_resource_type).toEqual(['image', 'video', 'raw']);
    expect(enums.care_task_status).toEqual(['pending', 'completed', 'cancelled']);
    expect(enums.audit_action).toEqual([
      'user.create',
      'user.deactivate',
      'user.activate',
      'user.role_assign',
      'medical_record.create',
      'medical_record.update',
      'medical_record.soft_delete',
      'medical_record.restore',
      'expense.create',
      'expense.soft_delete',
      'auth.login_success',
      'auth.login_failure',
      'access.denied',
      'care_task.create',
      'care_task.update',
      'care_task.complete',
      'care_task.cancel',
      'auth.refresh_success',
      'auth.refresh_failure',
    ]);
    expect(enums.audit_resource_type).toEqual([
      'user',
      'medical_record',
      'expense',
      'auth_session',
      'authorization',
      'care_task',
    ]);
  });

  it('declares the documented foreign keys with the correct ON DELETE policy', async () => {
    const rows: ForeignKeyRow[] = await dataSource.query(`
      SELECT
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table,
        rc.delete_rule AS delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
       AND tc.table_name = kcu.table_name
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.constraint_schema
      JOIN information_schema.key_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
       AND ccu.constraint_schema = rc.unique_constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    const fks = new Map(rows.map((r) => [`${r.table_name}.${r.column_name}`, r]));

    const expectFk = (table: string, column: string, foreignTable: string, onDelete: string) => {
      const key = `${table}.${column}`;
      expect(fks.get(key)).toEqual({
        table_name: table,
        column_name: column,
        foreign_table: foreignTable,
        delete_rule: onDelete,
      });
    };

    expectFk('veterinarians', 'userId', 'users', 'SET NULL');
    expectFk('animal_history_events', 'animalId', 'animals', 'RESTRICT');
    expectFk('animal_history_events', 'createdByUserId', 'users', 'SET NULL');
    expectFk('medical_records', 'animalId', 'animals', 'RESTRICT');
    expectFk('medical_records', 'veterinarianId', 'veterinarians', 'SET NULL');
    expectFk('medical_record_changes', 'medicalRecordId', 'medical_records', 'RESTRICT');
    expectFk('medical_record_changes', 'changedByUserId', 'users', 'SET NULL');
    expectFk('expenses', 'animalId', 'animals', 'RESTRICT');
    expectFk('expenses', 'ticketMediaId', 'media_assets', 'SET NULL');
    expectFk('expenses', 'createdByUserId', 'users', 'SET NULL');
    expectFk('animals', 'profilePhotoMediaId', 'media_assets', 'SET NULL');
    expectFk('media_assets', 'uploadedByUserId', 'users', 'SET NULL');
    expectFk('audit_logs', 'actorUserId', 'users', 'SET NULL');
    expectFk('care_tasks', 'animalId', 'animals', 'RESTRICT');
    expectFk('care_tasks', 'createdByUserId', 'users', 'SET NULL');
    expectFk('refresh_tokens', 'userId', 'users', 'RESTRICT');
    expectFk('refresh_tokens', 'replacedById', 'refresh_tokens', 'SET NULL');
  });

  it('declares the documented indexes and unique constraints', async () => {
    const rows: IndexRow[] = await dataSource.query(`
      SELECT
        t.relname AS table_name,
        i.relname AS index_name,
        ix.indisunique AS is_unique,
        array_agg(a.attname::text ORDER BY k.ord) AS columns
      FROM pg_index ix
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      GROUP BY t.relname, i.relname, ix.indisunique
      ORDER BY t.relname, i.relname
    `);

    const expectIndex = (table: string, columns: string[], unique = false) => {
      const found = rows.some(
        (r) =>
          r.table_name === table &&
          r.is_unique === unique &&
          arraysEqual(r.columns, columns),
      );
      expect(found).toBe(true);
    };

    expectIndex('users', ['email'], true);
    expectIndex('veterinarians', ['licenseNumber'], true);
    expectIndex('veterinarians', ['userId'], true);
    expectIndex('animals', ['status']);
    expectIndex('animal_history_events', ['animalId']);
    expectIndex('animal_history_events', ['occurredAt']);
    expectIndex('medical_records', ['animalId']);
    expectIndex('medical_records', ['occurredAt']);
    expectIndex('medical_record_changes', ['medicalRecordId']);
    expectIndex('medical_record_changes', ['changedAt']);
    expectIndex('expenses', ['animalId']);
    expectIndex('expenses', ['incurredAt']);
    expectIndex('media_assets', ['ownerType', 'ownerId']);
    expectIndex('media_assets', ['cloudinaryPublicId'], true);
    expectIndex('audit_logs', ['action']);
    expectIndex('audit_logs', ['occurredAt']);
    expectIndex('audit_logs', ['actorUserId']);
    expectIndex('audit_logs', ['resourceType', 'resourceId']);
    expectIndex('care_tasks', ['animalId']);
    expectIndex('care_tasks', ['status']);
    expectIndex('refresh_tokens', ['tokenHash'], true);
    expectIndex('refresh_tokens', ['familyId']);
    expectIndex('refresh_tokens', ['userId']);
    expectIndex('refresh_tokens', ['expiresAt']);
  });

  it('declares the CHECK constraints for non-negative money and bytes', async () => {
    const rows: { conname: string; definition: string }[] = await dataSource.query(`
      SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE contype = 'c'
        AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY conname
    `);

    const checks = new Map(rows.map((r) => [r.conname, normalizeSql(r.definition)]));

    expect(checks.get('CHK_expenses_amountCents_non_negative')).toContain('amountCents >= 0');
    expect(checks.get('CHK_media_assets_bytes_non_negative')).toContain(
      'bytes IS NULL OR bytes >= 0',
    );
  });

  it('uses UUID primary keys and the common soft-delete columns on every domain table', async () => {
    const rows: ColumnRow[] = await dataSource.query(
      `
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
        AND column_name IN ('id', 'createdAt', 'updatedAt', 'deletedAt')
      ORDER BY table_name, column_name
    `,
      [DOMAIN_TABLES],
    );

    const byTable = new Map<string, Map<string, ColumnRow>>();
    for (const row of rows) {
      const columns = byTable.get(row.table_name) ?? new Map<string, ColumnRow>();
      columns.set(row.column_name, row);
      byTable.set(row.table_name, columns);
    }

    for (const table of DOMAIN_TABLES) {
      const columns = byTable.get(table);
      expect(columns?.get('id')?.data_type).toBe('uuid');
      expect(columns?.get('createdAt')?.data_type).toBe('timestamp with time zone');
      expect(columns?.get('createdAt')?.is_nullable).toBe('NO');
      expect(columns?.get('updatedAt')?.data_type).toBe('timestamp with time zone');
      expect(columns?.get('updatedAt')?.is_nullable).toBe('NO');
      expect(columns?.get('deletedAt')?.data_type).toBe('timestamp with time zone');
      expect(columns?.get('deletedAt')?.is_nullable).toBe('YES');
    }
  });

  it('soft-deletes rows by setting deletedAt instead of removing them', async () => {
    const users = dataSource.getRepository(UserOrmEntity);
    const animals = dataSource.getRepository(AnimalOrmEntity);
    const expenses = dataSource.getRepository(ExpenseOrmEntity);

    const user = await users.save(
      users.create({
        email: 'softdelete.rfg45@refugiapp.test',
        passwordHash: 'not-a-real-hash',
        firstName: 'Soft',
        lastName: 'Delete',
        roles: [UserRole.ADMIN],
        isActive: true,
      }),
    );
    await users.softDelete({ id: user.id });
    expect(await users.count()).toBe(0);
    expect((await users.findOne({ where: { id: user.id }, withDeleted: true }))?.deletedAt).toBeInstanceOf(
      Date,
    );

    const animal = await animals.save(
      animals.create({ name: 'Softie', species: 'dog', intakeDate: '2025-01-01' }),
    );
    await animals.softDelete({ id: animal.id });
    expect(await animals.count()).toBe(0);
    expect(
      (await animals.findOne({ where: { id: animal.id }, withDeleted: true }))?.deletedAt,
    ).toBeInstanceOf(Date);

    const expense = await expenses.save(
      expenses.create({
        animalId: animal.id,
        category: ExpenseCategory.FOOD,
        amountCents: 100,
        currency: 'ARS',
        description: 'Soft-deleted expense',
        incurredAt: new Date(),
      }),
    );
    await expenses.softDelete({ id: expense.id });
    expect(await expenses.count()).toBe(0);
    expect(
      (await expenses.findOne({ where: { id: expense.id }, withDeleted: true }))?.deletedAt,
    ).toBeInstanceOf(Date);
  });
});

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function normalizeSql(definition: string | undefined): string {
  return (definition ?? '')
    .replace(/["()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
