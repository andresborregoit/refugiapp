import { DomainException } from '../../../../common/exceptions/domain.exception';
import { resolveEventOccurredAt } from './animal-event-date';

describe('resolveEventOccurredAt', () => {
  const intakeDate = new Date('2026-01-01T00:00:00.000Z');
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('defaults to now when no value is provided', () => {
    const result = resolveEventOccurredAt(undefined, intakeDate, now);

    expect(result).toEqual(now);
  });

  it('accepts a valid explicit date within range', () => {
    const explicit = '2026-03-10T10:00:00.000Z';

    expect(resolveEventOccurredAt(explicit, intakeDate, now)).toEqual(new Date(explicit));
  });

  it('accepts the exact intake date', () => {
    expect(resolveEventOccurredAt(intakeDate, intakeDate, now)).toEqual(intakeDate);
  });

  it('accepts the exact now date', () => {
    expect(resolveEventOccurredAt(now, intakeDate, now)).toEqual(now);
  });

  it('rejects a future date', () => {
    const future = '2026-12-01T00:00:00.000Z';

    expect(() => resolveEventOccurredAt(future, intakeDate, now)).toThrow(DomainException);

    try {
      resolveEventOccurredAt(future, intakeDate, now);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe('OCCURRED_AT_IN_FUTURE');
    }
  });

  it('rejects a date before intakeDate', () => {
    const beforeIntake = '2025-06-01T00:00:00.000Z';

    expect(() => resolveEventOccurredAt(beforeIntake, intakeDate, now)).toThrow(DomainException);

    try {
      resolveEventOccurredAt(beforeIntake, intakeDate, now);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).code).toBe('OCCURRED_AT_BEFORE_INTAKE');
    }
  });
});
