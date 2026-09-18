import { registerAs } from '@nestjs/config';

export const mediaConfig = registerAs('media', () => ({
  orphanRetentionHours: Number(process.env.MEDIA_ORPHAN_RETENTION_HOURS ?? 48),
  orphanPurgeLimit: Number(process.env.MEDIA_ORPHAN_PURGE_LIMIT ?? 500),
}));