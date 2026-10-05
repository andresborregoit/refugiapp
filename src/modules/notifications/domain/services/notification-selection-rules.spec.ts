import { NotificationKind } from '../enums/notification-kind.enum';
import { classifyDueTask, isWithinQuietHours } from './notification-selection-rules';

describe('notification-selection-rules', () => {
  const now = new Date('2026-11-01T12:00:00Z');

  it('classifies overdue, upcoming and future tasks', () => {
    expect(
      classifyDueTask({ status: 'pending', dueAt: new Date('2026-11-01T11:00:00Z') }, now),
    ).toBe(NotificationKind.OVERDUE);
    expect(
      classifyDueTask(
        { status: 'pending', dueAt: new Date('2026-11-01T12:30:00Z'), upcomingWindowMinutes: 60 },
        now,
      ),
    ).toBe(NotificationKind.UPCOMING);
    expect(
      classifyDueTask(
        { status: 'pending', dueAt: new Date('2026-11-02T12:00:00Z'), upcomingWindowMinutes: 60 },
        now,
      ),
    ).toBeNull();
  });

  it('ignores non-pending tasks and missing due dates', () => {
    expect(classifyDueTask({ status: 'completed', dueAt: new Date() }, now)).toBeNull();
    expect(classifyDueTask({ status: 'pending', dueAt: null }, now)).toBeNull();
  });

  it('detects quiet hours including overnight ranges', () => {
    const tz = 'America/Argentina/Buenos_Aires';

    expect(isWithinQuietHours(new Date('2026-11-01T02:00:00Z'), tz, '22:00', '07:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2026-11-01T12:00:00Z'), tz, '22:00', '07:00')).toBe(false);
    expect(isWithinQuietHours(now, tz, null, null)).toBe(false);
  });
});
