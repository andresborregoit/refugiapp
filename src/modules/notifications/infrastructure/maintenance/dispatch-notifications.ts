import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { requestContextStorage } from '../../../../common/storage/request-context';
import { NotificationDispatchService } from '../../application/services/notification-dispatch.service';

const MAX_DISPATCH_LIMIT = 10000;

interface CliOptions {
  dryRun: boolean;
  limit: number | null;
  requestId: string | null;
}

function parseCliArgs(argv: string[]): CliOptions {
  const dryRun = argv.includes('--dry-run');
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const requestIdArg = argv.find((arg) => arg.startsWith('--request-id='));

  return {
    dryRun,
    limit: limitArg ? Number(limitArg.split('=')[1]) : null,
    requestId: requestIdArg ? (requestIdArg.split('=')[1] ?? null) : null,
  };
}

function resolveLimit(value: number | null, fallback: number): number {
  const resolved = value ?? fallback;

  if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_DISPATCH_LIMIT) {
    throw new Error(`--limit must be an integer between 1 and ${MAX_DISPATCH_LIMIT}.`);
  }

  return resolved;
}

async function main(): Promise<void> {
  const logger = new JsonLoggerService('notifications:dispatch');
  const args = parseCliArgs(process.argv.slice(2));
  const requestId = args.requestId?.trim().length ? args.requestId.trim() : randomUUID();

  await requestContextStorage.run({ requestId }, async () => {
    const app = await NestFactory.createApplicationContext(AppModule, { logger });

    try {
      const dispatchService = app.get(NotificationDispatchService);
      const configService = app.get(ConfigService);
      const defaultLimit = configService.get<number>('push.dispatchLimit', 200);
      const limit = resolveLimit(args.limit, defaultLimit);

      logger.log(
        { event: 'push.dispatch.start', dryRun: args.dryRun, limit },
        'notifications:dispatch',
      );

      const result = await dispatchService.dispatch({ limit, dryRun: args.dryRun });

      logger.log({ event: 'push.dispatch.result', ...result }, 'notifications:dispatch');

      if (!result.dryRun && result.failed > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown dispatch error.';
      logger.error({ event: 'push.dispatch.failed', error: message }, 'notifications:dispatch');
      process.exitCode = 1;
    } finally {
      await app.close();
    }
  });
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const logger = new JsonLoggerService('notifications:dispatch');
    const message = error instanceof Error ? error.message : 'Unknown dispatch error.';
    logger.error({ event: 'push.dispatch.fatal', error: message }, 'notifications:dispatch');
    process.exitCode = 1;
  });
}
