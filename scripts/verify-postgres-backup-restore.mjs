import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  if (result.error) throw new Error(`${command} could not be started.`);
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`${command} failed with status ${result.status}.`);
  }
  return result.stdout.trim();
}

function query(databaseUrl, sql) {
  return run('psql', [
    '--dbname',
    databaseUrl,
    '--tuples-only',
    '--no-align',
    '--set',
    'ON_ERROR_STOP=1',
    '--command',
    sql,
  ]);
}

const sourceDatabaseUrl = requiredEnvironment('DATABASE_URL');
const restoreDatabaseUrl = requiredEnvironment('RESTORE_DATABASE_URL');
const restoreDatabaseName = new URL(restoreDatabaseUrl).pathname.slice(1);
const backupDirectory = await mkdtemp(join(tmpdir(), 'refugiapp-backup-restore-'));
const userId = '00000000-0000-4000-8000-000000000050';
const animalId = '00000000-0000-4000-8000-000000000051';
const medicalRecordId = '00000000-0000-4000-8000-000000000052';
const expenseId = '00000000-0000-4000-8000-000000000053';
const fixturesSql = `
  INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", roles, "isActive")
  VALUES ('${userId}', 'recovery-test@refugiapp.invalid', 'test-only-hash', 'Recovery', 'Test', '{admin}', true);
  INSERT INTO animals (id, name, species, sex, status, "intakeDate")
  VALUES ('${animalId}', 'Recovery Test Animal', 'dog', 'unknown', 'under_treatment', CURRENT_DATE);
  INSERT INTO medical_records (id, "animalId", "recordType", title, diagnosis, "occurredAt")
  VALUES ('${medicalRecordId}', '${animalId}', 'consultation', 'Recovery clinical record', 'Healthy', now());
  INSERT INTO expenses (id, "animalId", category, "amountCents", currency, description, "createdByUserId", "incurredAt")
  VALUES ('${expenseId}', '${animalId}', 'veterinary', 7250, 'ARS', 'Recovery financial record', '${userId}', now());
`;
const signatureSql = `
  SELECT string_agg(area || ':' || value, ',' ORDER BY area)
  FROM (
    SELECT 'clinical' AS area, title AS value FROM medical_records WHERE id = '${medicalRecordId}'
    UNION ALL
    SELECT 'financial', "amountCents"::text FROM expenses WHERE id = '${expenseId}'
    UNION ALL
    SELECT 'operational', email FROM users WHERE id = '${userId}'
  ) restored_values
`;
const cleanupSql = `
  DELETE FROM medical_records WHERE id = '${medicalRecordId}';
  DELETE FROM expenses WHERE id = '${expenseId}';
  DELETE FROM animals WHERE id = '${animalId}';
  DELETE FROM users WHERE id = '${userId}';
`;

try {
  query(sourceDatabaseUrl, fixturesSql);

  const backupOutput = run(process.execPath, ['scripts/postgres-backup.mjs'], {
    env: {
      ...process.env,
      DATABASE_URL: sourceDatabaseUrl,
      BACKUP_DIR: backupDirectory,
      BACKUP_RETENTION_DAYS: '1',
      BACKUP_VISIBILITY: 'private',
      APP_ENV: 'test',
    },
  });
  const backupResult = JSON.parse(backupOutput.split(/\r?\n/).at(-1));
  const backup = await readFile(backupResult.backupPath);
  const backupManifest = run('pg_restore', ['--list', backupResult.backupPath]);

  if (process.platform !== 'win32') {
    const mode = (await stat(backupResult.backupPath)).mode & 0o777;
    if (mode !== 0o600)
      throw new Error(`Backup permissions are ${mode.toString(8)}, expected 600.`);
  }

  for (const name of ['DATABASE_PASSWORD_CANARY', 'JWT_SECRET_CANARY']) {
    const canary = process.env[name];
    if (canary && (backup.includes(Buffer.from(canary)) || backupManifest.includes(canary))) {
      throw new Error(`${name} was found in the backup.`);
    }
  }

  const publicAttempt = spawnSync(process.execPath, ['scripts/postgres-backup.mjs'], {
    encoding: 'utf8',
    env: {
      ...process.env,
      DATABASE_URL: sourceDatabaseUrl,
      BACKUP_DIR: backupDirectory,
      BACKUP_VISIBILITY: 'public',
    },
  });
  if (publicAttempt.status === 0) throw new Error('A public backup was unexpectedly accepted.');
  for (const name of ['DATABASE_PASSWORD_CANARY', 'JWT_SECRET_CANARY']) {
    const canary = process.env[name];
    const output = `${publicAttempt.stdout}${publicAttempt.stderr}`;
    if (canary && output.includes(canary)) throw new Error(`${name} was exposed in backup output.`);
  }

  run(process.execPath, ['scripts/postgres-restore.mjs'], {
    env: {
      ...process.env,
      BACKUP_FILE: backupResult.backupPath,
      RESTORE_DATABASE_URL: restoreDatabaseUrl,
      RESTORE_CONFIRMATION: restoreDatabaseName,
    },
  });

  const sourceSignature = query(sourceDatabaseUrl, signatureSql);
  const restoredSignature = query(restoreDatabaseUrl, signatureSql);
  const sourceMigrations = query(sourceDatabaseUrl, 'SELECT count(*) FROM migrations');
  const restoredMigrations = query(restoreDatabaseUrl, 'SELECT count(*) FROM migrations');

  if (restoredSignature !== sourceSignature)
    throw new Error('Restored domain data does not match.');
  if (restoredMigrations !== sourceMigrations)
    throw new Error('Restored migration state does not match.');

  console.info(
    JSON.stringify({
      status: 'ok',
      restoredDatabase: restoreDatabaseName,
      verifiedAreas: 3,
      verifiedMigrations: Number(restoredMigrations),
    }),
  );
} finally {
  try {
    query(sourceDatabaseUrl, cleanupSql);
  } finally {
    await rm(backupDirectory, { recursive: true, force: true });
  }
}
