import { NotificationKind } from '../enums/notification-kind.enum';

export interface DueSelectionInput {
  status: string;
  dueAt: Date | null;
  now?: Date;
  upcomingWindowMinutes?: number;
}

export function classifyDueTask(
  input: DueSelectionInput,
  now: Date = new Date(),
): NotificationKind | null {
  if (input.status !== 'pending' || !input.dueAt) {
    return null;
  }

  const dueTime = input.dueAt.getTime();

  if (dueTime < now.getTime()) {
    return NotificationKind.OVERDUE;
  }

  const windowMinutes = input.upcomingWindowMinutes ?? 60;
  const windowMs = windowMinutes * 60 * 1000;

  if (dueTime <= now.getTime() + windowMs) {
    return NotificationKind.UPCOMING;
  }

  return null;
}

export function parseQuietTime(value: string | null): { hours: number; minutes: number } | null {
  if (value === null || value === undefined) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

export function isWithinQuietHours(
  now: Date,
  timeZone: string,
  quietStart: string | null,
  quietEnd: string | null,
): boolean {
  const start = parseQuietTime(quietStart);
  const end = parseQuietTime(quietEnd);

  if (!start || !end) {
    return false;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  const [h, m] = parts.split(':').map(Number);
  const current = h * 60 + m;
  const from = start.hours * 60 + start.minutes;
  const to = end.hours * 60 + end.minutes;

  if (from <= to) {
    return current >= from && current < to;
  }

  return current >= from || current < to;
}
