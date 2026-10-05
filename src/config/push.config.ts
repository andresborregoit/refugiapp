import { registerAs } from '@nestjs/config';

export const pushConfig = registerAs('push', () => ({
  provider: process.env.PUSH_PROVIDER ?? 'noop',
  expoPushUrl: process.env.EXPO_PUSH_URL ?? 'https://exp.host/--/api/v2/push/send',
  timeoutMs: Number(process.env.PUSH_TIMEOUT_MS ?? 8000),
  batchSize: Number(process.env.PUSH_BATCH_SIZE ?? 100),
  dispatchLimit: Number(process.env.PUSH_DISPATCH_LIMIT ?? 200),
  upcomingWindowMinutes: Number(process.env.PUSH_UPCOMING_WINDOW_MINUTES ?? 60),
  dryRun: process.env.PUSH_DRY_RUN === 'true',
}));
