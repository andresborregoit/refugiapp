import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { MediaService } from '../../application/services/media.service';

interface CliOptions {
  dryRun: boolean;
  olderThanHours: number | null;
  limit: number | null;
}

function parseCliArgs(argv: string[]): CliOptions {
  const dryRun = argv.includes('--dry-run');
  const olderThanHoursArg = argv.find((arg) => arg.startsWith('--older-than-hours='));
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));

  return {
    dryRun,
    olderThanHours: olderThanHoursArg ? Number(olderThanHoursArg.split('=')[1]) : null,
    limit: limitArg ? Number(limitArg.split('=')[1]) : null,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const mediaService = app.get(MediaService);
    const configService = app.get(ConfigService);

    const args = parseCliArgs(process.argv.slice(2));
    const defaultHours = configService.get<number>('media.orphanRetentionHours', 48);
    const defaultLimit = configService.get<number>('media.orphanPurgeLimit', 500);

    const olderThanHours =
      args.olderThanHours !== null && Number.isFinite(args.olderThanHours)
        ? args.olderThanHours
        : defaultHours;
    const limit = args.limit !== null && Number.isFinite(args.limit) ? args.limit : defaultLimit;

    const result = await mediaService.purgeExpiredOrphans({
      olderThanHours,
      limit,
      dryRun: args.dryRun,
    });

    if (result.dryRun) {
      console.info(
        `[dry-run] Found ${result.candidates.length} orphan media assets older than ${olderThanHours}h. No changes applied.`,
      );
      return;
    }

    console.info(
      `Purged ${result.deleted} orphan media assets (${result.failed} failed) older than ${olderThanHours}h.`,
    );
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown orphan purge error.';
    console.error(message);
    process.exitCode = 1;
  });
}