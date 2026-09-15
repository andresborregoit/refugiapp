import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { AuditLogOrmEntity } from '../../src/modules/audit-logs/infrastructure/persistence/typeorm/entities/audit-log.orm-entity';
import { AnimalHistoryEventOrmEntity } from '../../src/modules/animals/infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../../src/modules/animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { ExpenseOrmEntity } from '../../src/modules/expenses/infrastructure/persistence/typeorm/entities/expense.orm-entity';
import { MediaAssetOrmEntity } from '../../src/modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { MedicalRecordChangeOrmEntity } from '../../src/modules/medical-records/infrastructure/persistence/typeorm/entities/medical-record-change.orm-entity';
import { MedicalRecordOrmEntity } from '../../src/modules/medical-records/infrastructure/persistence/typeorm/entities/medical-record.orm-entity';
import { UserOrmEntity } from '../../src/modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { VeterinarianOrmEntity } from '../../src/modules/veterinarians/infrastructure/persistence/typeorm/entities/veterinarian.orm-entity';

export const TEST_DATABASE_NAME = 'refugiapp_test';

export interface IsolatedPostgres {
  url: string;
  container: StartedPostgreSqlContainer | null;
  stop: () => Promise<void>;
}

const ALL_ENTITIES = [
  AuditLogOrmEntity,
  AnimalHistoryEventOrmEntity,
  AnimalOrmEntity,
  ExpenseOrmEntity,
  MediaAssetOrmEntity,
  MedicalRecordChangeOrmEntity,
  MedicalRecordOrmEntity,
  UserOrmEntity,
  VeterinarianOrmEntity,
];

const ALL_TABLES = [
  'medical_record_changes',
  'medical_records',
  'expenses',
  'animal_history_events',
  'animals',
  'veterinarians',
  'media_assets',
  'audit_logs',
  'users',
];

/**
 * Levanta una base PostgreSQL aislada y descartable, distinta de Neon.
 *
 * Prefiere Testcontainers (postgres:16-alpine) cuando Docker esta disponible;
 * en CI acepta las variables E2E_DATABASE_* para usar el service del workflow.
 * Nunca lee DATABASE_URL del entorno del desarrollador y rechaza bases Neon.
 */
export async function startIsolatedPostgres(): Promise<IsolatedPostgres> {
  const externalUrl = resolveExternalDatabaseUrl();

  let url: string;
  let container: StartedPostgreSqlContainer | null = null;

  if (externalUrl) {
    assertSafeDatabaseName(externalUrl);
    url = externalUrl;
  } else {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase(TEST_DATABASE_NAME)
      .withUsername(TEST_DATABASE_NAME)
      .withPassword(TEST_DATABASE_NAME)
      .start();
    url = container.getConnectionUri();
  }

  applyDatabaseEnvironment(url);

  return {
    url,
    container,
    async stop() {
      if (container) {
        await container.stop();
      }
    },
  };
}

/**
 * Construye un DataSource TypeORM contra la base aislada con entidades
 * explicitas y synchronize siempre desactivado.
 */
export function buildTestDataSource(url: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url,
    entities: ALL_ENTITIES,
    migrations: ['src/database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: false,
    ssl: false,
  });
}

export async function initializeWithMigrations(dataSource: DataSource): Promise<void> {
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });
}

/**
 * Limpia todas las tablas de dominio entre suites, incluyendo audit_logs,
 * respetando foreign keys mediante TRUNCATE ... CASCADE.
 */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tableList = ALL_TABLES.map((table) => `"${table}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

function applyDatabaseEnvironment(url: string): void {
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.DB_SSL = 'false';
  process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';
  process.env.DB_POOL_SIZE = '5';
  process.env.TYPEORM_SYNCHRONIZE = 'false';
  process.env.TYPEORM_LOGGING = 'false';
}

function assertSafeDatabaseName(url: string): void {
  const name = databaseNameFromUrl(url);
  if (/neon/i.test(name)) {
    throw new Error(
      `Refusing to run integration tests against a Neon database ("${name}"). ` +
        'Use a dedicated test database such as refugiapp_test.',
    );
  }
}

function databaseNameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    return decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return '';
  }
}

export function resolveExternalDatabaseUrl(): string | undefined {
  if (process.env.E2E_DATABASE_URL) {
    return process.env.E2E_DATABASE_URL;
  }

  const host = process.env.E2E_DATABASE_HOST;
  if (!host) {
    return undefined;
  }

  const port = process.env.E2E_DATABASE_PORT ?? '5432';
  const database = process.env.E2E_DATABASE_NAME;
  const username = process.env.E2E_DATABASE_USER;
  const password = process.env.E2E_DATABASE_PASSWORD;

  if (!database || !username || !password) {
    throw new Error('E2E database host requires name, user and password.');
  }

  return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(
    password,
  )}@${host}:${port}/${database}`;
}
