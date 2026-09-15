import { Inject, Injectable } from '@nestjs/common';
import { EXPENSE_REPOSITORY, ExpenseRepository } from '../../domain/repositories/expense.repository';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: ExpenseRepository,
  ) {}

  findById(id: string) {
    return this.expenseRepository.findById(id);
  }
}
