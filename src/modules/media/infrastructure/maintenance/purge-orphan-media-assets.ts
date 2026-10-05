import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { requestContextStorage } from '../../../../common/storage/request-context';
import { MediaService } from '../../application/services/media.service';

const MAX_ORPHAN_RETENTION_HOURS = 720;
const MAX_ORPHAN_PURGE_LIMIT = 10000;

interface CliOptions {
  dryRun: boolean;
  olderThanHours: number | null;
  limit: number | null;
  requestId: string | null;
}

function parseCliArgs(argv: string[]): CliOptions {
  const dryRun = argv.includes('--dry-run');
  const olderThanHoursArg = argv.find((arg) => arg.startsWith('--older-than-hours='));
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const requestIdArg = argv.find((arg) => arg.startsWith('--request-id='));

  return {
    dryRun,
    olderThanHours: parseNumericFlag(olderThanHoursArg),
    limit: parseNumericFlag(limitArg),
    requestId: requestIdArg ? requestIdArg.split('=')[1] ?? null : null,
  };
}

function parseNumericFlag(flag: string | undefined): number | null {
  if (!flag) {
    return null;
  }

  return Number(flag.split('=')[1]);
}

function resolveRetentionHours(value: number | null, fallback: number): number {
  const resolved = value ?? fallback;

  if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_ORPHAN_RETENTION_HOURS) {
    throw new Error(`--older-than-hours must be an integer between 1 and ${MAX_ORPHAN_RETENTION_HOURS}.`);
  }

  return resolved;
}

function resolvePurgeLimit(value: number | null, fallback: number): number {
  const resolved = value ?? fallback;

  if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_ORPHAN_PURGE_LIMIT) {
    throw new Error(`--limit must be an integer between 1 and ${MAX_ORPHAN_PURGE_LIMIT}.`);
  }

  return resolved;
}

async function main(): Promise<void> {
  const logger = new JsonLoggerService('media:purge-orphans');
  const args = parseCliArgs(process.argv.slice(2));
  const requestId = args.requestId?.trim().length ? args.requestId.trim() : randomUUID();

  await requestContextStorage.run({ requestId }, async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger });

    try {
      const mediaService = app.get(MediaService);
      const configService = app.get(ConfigService);

      const defaultHours = configService.get<number>('media.orphanRetentionHours', 48);
      const defaultLimit = configService.get<number>('media.orphanPurgeLimit', 500);

      const olderThanHours = resolveRetentionHours(args.olderThanHours, defaultHours);
      const limit = resolvePurgeLimit(args.limit, defaultLimit);

      logger.log(
        {
          event: 'media.orphan_purge.start',
          dryRun: args.dryRun,
          olderThanHours,
          limit,
        },
        'media:purge-orphans',
      );

      const result = await mediaService.purgeExpiredOrphans({
        olderThanHours,
        limit,
        dryRun: args.dryRun,
      });

      logger.log(
        {
          event: 'media.orphan_purge.result',
          dryRun: result.dryRun,
          olderThanHours,
          limit,
          threshold: result.threshold.toISOString(),
          candidates: result.candidates.length,
          deleted: result.deleted,
          failed: result.failed,
          skipped: result.skipped,
        },
        'media:purge-orphans',
      );

      if (!result.dryRun && result.failed > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown orphan purge error.';
      logger.error({ event: 'media.orphan_purge.failed', error: message }, 'media:purge-orphans');
      process.exitCode = 1;
    } finally {
      await app.close();
    }
  });
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const logger = new JsonLoggerService('media:purge-orphans');
    const message = error instanceof Error ? error.message : 'Unknown orphan purge error.';
    logger.error({ event: 'media.orphan_purge.fatal', error: message }, 'media:purge-orphans');
    process.exitCode = 1;
  });
}