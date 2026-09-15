import { DomainException } from '../../../../common/exceptions/domain.exception';

export function resolveEventOccurredAt(
  raw: string | Date | undefined,
  intakeDate: Date,
  now: Date,
): Date {
  const resolved = raw ? new Date(raw) : now;

  if (resolved.getTime() > now.getTime()) {
    throw new DomainException(
      'Event date cannot be in the future.',
      'OCCURRED_AT_IN_FUTURE',
    );
  }

  if (resolved.getTime() < intakeDate.getTime()) {
    throw new DomainException(
      'Event date cannot be before the animal intake date.',
      'OCCURRED_AT_BEFORE_INTAKE',
    );
  }

  return resolved;
}
