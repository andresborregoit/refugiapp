import { NotificationKind } from '../enums/notification-kind.enum';
import { buildDedupKey, hashPushToken, toDueDateBucket } from './notification-dedup-key';

describe('notification-dedup-key', () => {
  it('hashes tokens without leaking the full value in the suffix', () => {
    const { tokenHash, tokenSuffix } = hashPushToken('ExponentPushToken[abc123]');
    const other = hashPushToken('ExponentPushToken[abc123]');

    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toBe(other.tokenHash);
    expect(tokenSuffix).toBe('bc123]');
    expect(tokenHash).not.toContain('ExponentPushToken');
  });

  it('builds a stable dedup key per occurrence, user and kind', () => {
    const dueAt = new Date('2026-11-01T10:00:00Z');
    const key = buildDedupKey({
      kind: NotificationKind.OVERDUE,
      careTaskId: 'task-1',
      dueAt,
      userId: 'user-1',
      timeZone: 'America/Argentina/Buenos_Aires',
    });

    expect(key).toBe(
      `v1:overdue:task-1:${toDueDateBucket(dueAt, 'America/Argentina/Buenos_Aires')}:user-1`,
    );
    expect(
      buildDedupKey({
        kind: NotificationKind.UPCOMING,
        careTaskId: 'task-1',
        dueAt,
        userId: 'user-1',
        timeZone: 'America/Argentina/Buenos_Aires',
      }),
    ).not.toBe(key);
  });
});
