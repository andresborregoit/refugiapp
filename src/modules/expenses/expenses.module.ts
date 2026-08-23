import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './application/services/expenses.service';
import { EXPENSE_REPOSITORY } from './domain/repositories/expense.repository';
import { ExpenseOrmEntity } from './infrastructure/persistence/typeorm/entities/expense.orm-entity';
import { TypeOrmExpenseRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-expense.repository';
import { ExpensesController } from './interfaces/controllers/expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseOrmEntity])],
  controllers: [ExpensesController],
  providers: [
    ExpensesService,
    {
      provide: EXPENSE_REPOSITORY,
      useClass: TypeOrmExpenseRepository,
    },
  ],
  exports: [ExpensesService, EXPENSE_REPOSITORY],
})
export class ExpensesModule {}
