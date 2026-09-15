import { DomainException } from '../../../../common/exceptions/domain.exception';

export function validateRecordOccurredAt(
  occurredAt: Date,
  intakeDate: Date,
  now: Date,
): void {
  if (occurredAt.getTime() > now.getTime()) {
    throw new DomainException(
      'Record date cannot be in the future.',
      'OCCURRED_AT_IN_FUTURE',
    );
  }

  if (occurredAt.getTime() < intakeDate.getTime()) {
    throw new DomainException(
      'Record date cannot be before the animal intake date.',
      'OCCURRED_AT_BEFORE_INTAKE',
    );
  }
}
