import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { basename, join, resolve } from 'node:path';
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

async function removeExpiredBackups(directory, retentionDays) {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.dump(?:\.sha256)?$/.test(entry.name)) continue;

    const path = join(directory, entry.name);
    if ((await stat(path)).mtimeMs < cutoff) await rm(path, { force: true });
  }
}

const databaseUrl = requiredEnvironment('DATABASE_URL');
const visibility = process.env.BACKUP_VISIBILITY ?? 'private';
const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS ?? '35', 10);
const appEnvironment = (process.env.APP_ENV ?? 'development').toLowerCase();

if (visibility !== 'private') {
  throw new Error('PostgreSQL backups must use private visibility.');
}
if (!Number.isInteger(retentionDays) || retentionDays < 1) {
  throw new Error('BACKUP_RETENTION_DAYS must be a positive integer.');
}
if (!/^[a-z0-9-]+$/.test(appEnvironment)) {
  throw new Error('APP_ENV contains unsupported characters.');
}

const backupDirectory = resolve(process.env.BACKUP_DIR ?? 'backups');
const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}Z$/, 'Z');
const backupPath = join(backupDirectory, `refugiapp-${appEnvironment}-${timestamp}.dump`);
const temporaryPath = `${backupPath}.${randomUUID()}.partial`;
const checksumPath = `${backupPath}.sha256`;

await mkdir(backupDirectory, { recursive: true, mode: 0o700 });

try {
  const serverVersionNumber = Number(
    run(
      'psql',
      [
        '--dbname',
        databaseUrl,
        '--tuples-only',
        '--no-align',
        '--command',
        "SELECT current_setting('server_version_num')",
      ],
      true,
    ),
  );
  const serverMajorVersion = Math.floor(serverVersionNumber / 10000);
  const pgDumpMajorVersion = commandMajorVersion('pg_dump', run('pg_dump', ['--version'], true));
  if (pgDumpMajorVersion !== serverMajorVersion) {
    throw new Error(
      `pg_dump major version ${pgDumpMajorVersion} must match PostgreSQL server major version ${serverMajorVersion}.`,
    );
  }

  run('pg_dump', [
    '--dbname',
    databaseUrl,
    '--format=custom',
    '--compress=9',
    '--no-owner',
    '--no-privileges',
    '--file',
    temporaryPath,
  ]);
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, backupPath);

  const digest = await sha256(backupPath);
  await writeFile(checksumPath, `${digest}  ${basename(backupPath)}\n`, { mode: 0o600 });
  await chmod(checksumPath, 0o600);
  await removeExpiredBackups(backupDirectory, retentionDays);

  console.info(JSON.stringify({ backupPath, checksumPath, retentionDays }));
} catch (error) {
  await rm(temporaryPath, { force: true });
  throw error;
}
