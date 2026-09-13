import { CreateExpense } from '../entities/create-expense.entity';
import { Expense } from '../entities/expense.entity';
import { ExpenseCategory } from '../enums/expense-category.enum';

export const EXPENSE_REPOSITORY = Symbol('EXPENSE_REPOSITORY');

export interface ExpenseListQuery {
  page: number;
  limit: number;
  animalId?: string;
  category?: ExpenseCategory;
  from?: Date;
  to?: Date;
}

export interface PaginatedExpenses {
  items: Expense[];
  page: number;
  limit: number;
  total: number;
}

export interface ExpenseRepository {
  save(input: CreateExpense): Promise<Expense>;
  findById(id: string): Promise<Expense | null>;
  findMany(query: ExpenseListQuery): Promise<PaginatedExpenses>;
  softDelete(id: string): Promise<void>;
}
