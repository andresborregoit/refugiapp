import { Expense } from '../entities/expense.entity';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

export interface ExpenseRepository {
  findById(id: string): Promise<Expense | null>;
}
