import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function run(command, args, captureOutput = false) {
  const result = spawnSync(command, args, {
    encoding: captureOutput ? 'utf8' : undefined,
    stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) throw new Error(`${command} could not be started.`);
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}.`);
  return captureOutput ? result.stdout.trim() : '';
}

function commandMajorVersion(command, versionOutput) {
  const match = versionOutput.match(/(\d+)(?:\.\d+)?/);
  if (!match) throw new Error(`${command} version could not be determined.`);
  return Number(match[1]);
}

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

const backupPath = resolve(requiredEnvironment('BACKUP_FILE'));
const restoreDatabaseUrl = requiredEnvironment('RESTORE_DATABASE_URL');
const confirmation = requiredEnvironment('RESTORE_CONFIRMATION');

await stat(backupPath);

const targetDatabase = run(
  'psql',
  [
    '--dbname',
    restoreDatabaseUrl,
    '--tuples-only',
    '--no-align',
    '--command',
    'SELECT current_database()',
  ],
  true,
);
const serverVersionNumber = Number(
  run(
    'psql',
    [
      '--dbname',
      restoreDatabaseUrl,
      '--tuples-only',
      '--no-align',
      '--command',
      "SELECT current_setting('server_version_num')",
    ],
    true,
  ),
);
const serverMajorVersion = Math.floor(serverVersionNumber / 10000);
const pgRestoreMajorVersion = commandMajorVersion(
  'pg_restore',
  run('pg_restore', ['--version'], true),
);

if (confirmation !== targetDatabase) {
  throw new Error('RESTORE_CONFIRMATION does not match the target database.');
}
if (['postgres', 'template0', 'template1'].includes(targetDatabase)) {
  throw new Error('Restoring into a PostgreSQL system database is not allowed.');
}
if (pgRestoreMajorVersion !== serverMajorVersion) {
  throw new Error(
    `pg_restore major version ${pgRestoreMajorVersion} must match PostgreSQL server major version ${serverMajorVersion}.`,
  );
}
if (
  process.env.ALLOW_IN_PLACE_RESTORE !== 'true' &&
  !/(?:restore|recovery|test)/i.test(targetDatabase)
) {
  throw new Error('The target must be an isolated restore database.');
}

const checksumPath = `${backupPath}.sha256`;
const checksum = (await readFile(checksumPath, 'utf8')).trim().split(/\s+/)[0];
if (checksum !== (await sha256(backupPath))) {
  throw new Error(`Checksum validation failed for ${basename(backupPath)}.`);
}

run('pg_restore', [
  '--dbname',
  restoreDatabaseUrl,
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-privileges',
  '--exit-on-error',
  backupPath,
]);

console.info(JSON.stringify({ restoredBackup: basename(backupPath), targetDatabase }));
