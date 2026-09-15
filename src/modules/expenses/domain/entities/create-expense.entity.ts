import { ExpenseCategory } from '../enums/expense-category.enum';

export class CreateExpense {
  constructor(
    public readonly animalId: string,
    public readonly category: ExpenseCategory,
    public readonly amountCents: number,
    public readonly currency: string,
    public readonly description: string,
    public readonly incurredAt: Date,
    public readonly createdByUserId: string,
    public readonly ticketMediaId: string | null = null,
  ) {}
}