import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ExpenseCategory } from '../enums/expense-category.enum';

export class Expense {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly category: ExpenseCategory,
    public readonly amountCents: number,
    public readonly currency: string,
    public readonly incurredAt: Date,
  ) {
    if (amountCents < 0) {
      throw new DomainException(
        'amountCents must be greater than or equal to 0.',
        'AMOUNT_CENTS_NEGATIVE',
      );
    }
  }
}
