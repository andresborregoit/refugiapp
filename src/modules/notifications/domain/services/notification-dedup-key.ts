import { createHash } from 'node:crypto';
import { NotificationKind } from '../enums/notification-kind.enum';

export const DEDUP_KEY_VERSION = 'v1';

export function hashPushToken(token: string): { tokenHash: string; tokenSuffix: string } {
  const normalized = token.trim();
  const tokenHash = createHash('sha256').update(normalized).digest('hex');
  const tokenSuffix = normalized.slice(-6);

  return { tokenHash, tokenSuffix };
}

export function toDueDateBucket(dueAt: Date | null, timeZone: string): string {
  if (!dueAt) {
    return 'no-due';
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(dueAt);
}

export function buildDedupKey(input: {
  kind: NotificationKind;
  careTaskId: string;
  dueAt: Date | null;
  userId: string;
  timeZone: string;
}): string {
  const bucket = toDueDateBucket(input.dueAt, input.timeZone);

  return `${DEDUP_KEY_VERSION}:${input.kind}:${input.careTaskId}:${bucket}:${input.userId}`;
}
