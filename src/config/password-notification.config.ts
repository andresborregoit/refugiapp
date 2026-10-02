import { registerAs } from '@nestjs/config';

export const passwordNotificationConfig = registerAs('passwordNotification', () => ({
  webhookUrl: process.env.PASSWORD_NOTIFICATION_WEBHOOK_URL ?? '',
  webhookSecret: process.env.PASSWORD_NOTIFICATION_WEBHOOK_SECRET ?? '',
  resetUrl: process.env.PASSWORD_RESET_URL ?? 'http://localhost:3000/reset-password',
  resetTokenTtlMs: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MS ?? 30 * 60 * 1000),
  timeoutMs: Number(process.env.PASSWORD_NOTIFICATION_TIMEOUT_MS ?? 5000),
}));
