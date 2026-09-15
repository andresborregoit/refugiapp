import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ExpenseCategory } from '../enums/expense-category.enum';
import { Expense } from './expense.entity';

describe('Expense', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');

  function createExpense(amountCents: number): Expense {
    return new Expense(
      'expense-id',
      'animal-id',
      ExpenseCategory.MEDICINE,
      amountCents,
      'ARS',
      'Antibiotics',
      new Date('2026-03-10T10:00:00.000Z'),
      null,
      null,
      now,
      now,
    );
  }

  it('accepts zero amountCents', () => {
    expect(createExpense(0).amountCents).toBe(0);
  });

  it('accepts positive amountCents', () => {
    expect(createExpense(1).amountCents).toBe(1);
  });

  it('rejects negative amountCents', () => {
    expect(() => createExpense(-1)).toThrow(DomainException);

    try {
      createExpense(-1);
    } catch (error) {
      expect((error as DomainException).code).toBe('AMOUNT_CENTS_NEGATIVE');
    }
  });

  it('defaults ticketMediaId and createdByUserId to null', () => {
    const expense = createExpense(100);

    expect(expense.ticketMediaId).toBeNull();
    expect(expense.createdByUserId).toBeNull();
  });

  it('preserves ticketMediaId and createdByUserId when provided', () => {
    const expense = new Expense(
      'expense-id',
      'animal-id',
      ExpenseCategory.MEDICINE,
      100,
      'ARS',
      'Antibiotics',
      new Date('2026-03-10T10:00:00.000Z'),
      'media-id',
      'user-id',
      now,
      now,
    );

    expect(expense.ticketMediaId).toBe('media-id');
    expect(expense.createdByUserId).toBe('user-id');
  });
});
