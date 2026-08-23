import { ExpenseCategory } from '../enums/expense-category.enum';

export class Expense {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly category: ExpenseCategory,
    public readonly amountCents: number,
    public readonly currency: string,
    public readonly incurredAt: Date,
  ) {}
}
