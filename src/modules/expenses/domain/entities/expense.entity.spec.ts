import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ExpenseCategory } from '../enums/expense-category.enum';
import { Expense } from './expense.entity';

describe('Expense', () => {
  function createExpense(amountCents: number): Expense {
    return new Expense(
      'expense-id',
      'animal-id',
      ExpenseCategory.MEDICINE,
      amountCents,
      'ARS',
      new Date('2026-03-10T10:00:00.000Z'),
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
});
