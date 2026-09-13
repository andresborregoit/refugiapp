import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalsModule } from '../animals/animals.module';
import { MediaModule } from '../media/media.module';
import { ExpensesService } from './application/services/expenses.service';
import { EXPENSE_REPOSITORY } from './domain/repositories/expense.repository';
import { ExpenseOrmEntity } from './infrastructure/persistence/typeorm/entities/expense.orm-entity';
import { TypeOrmExpenseRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-expense.repository';
import { AnimalExpensesController } from './interfaces/controllers/animal-expenses.controller';
import { ExpensesController } from './interfaces/controllers/expenses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseOrmEntity]), forwardRef(() => AnimalsModule), forwardRef(() => MediaModule)],
  controllers: [ExpensesController, AnimalExpensesController],
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