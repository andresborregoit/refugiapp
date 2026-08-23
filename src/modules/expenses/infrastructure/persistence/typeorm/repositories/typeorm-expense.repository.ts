import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from '../../../../domain/entities/expense.entity';
import { ExpenseRepository } from '../../../../domain/repositories/expense.repository';
import { ExpenseOrmEntity } from '../entities/expense.orm-entity';

@Injectable()
export class TypeOrmExpenseRepository implements ExpenseRepository {
  constructor(
    @InjectRepository(ExpenseOrmEntity)
    private readonly repository: Repository<ExpenseOrmEntity>,
  ) {}

  async findById(id: string): Promise<Expense | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: ExpenseOrmEntity): Expense {
    return new Expense(
      entity.id,
      entity.animalId,
      entity.category,
      entity.amountCents,
      entity.currency,
      entity.incurredAt,
    );
  }
}
