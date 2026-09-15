import { DomainException } from '../../../../common/exceptions/domain.exception';
import { validateRecordOccurredAt } from './medical-record-date';

describe('validateRecordOccurredAt', () => {
  const intakeDate = new Date('2026-01-01T00:00:00.000Z');
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('accepts a valid date within range', () => {
    expect(() =>
      validateRecordOccurredAt(new Date('2026-03-10T10:00:00.000Z'), intakeDate, now),
    ).not.toThrow();
  });

  it('accepts the exact intake date', () => {
    expect(() => validateRecordOccurredAt(intakeDate, intakeDate, now)).not.toThrow();
  });

  it('accepts the exact now date', () => {
    expect(() => validateRecordOccurredAt(now, intakeDate, now)).not.toThrow();
  });

  it('rejects a future date', () => {
    const future = new Date('2026-12-01T00:00:00.000Z');

    expect(() => validateRecordOccurredAt(future, intakeDate, now)).toThrow(DomainException);

    try {
      validateRecordOccurredAt(future, intakeDate, now);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe('OCCURRED_AT_IN_FUTURE');
    }
  });

  it('rejects a date before intakeDate', () => {
    const beforeIntake = new Date('2025-06-01T00:00:00.000Z');

    expect(() => validateRecordOccurredAt(beforeIntake, intakeDate, now)).toThrow(DomainException);

    try {
      validateRecordOccurredAt(beforeIntake, intakeDate, now);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe('OCCURRED_AT_BEFORE_INTAKE');
    }
  });
});
