import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateExpense } from '../../../../domain/entities/create-expense.entity';
import { Expense } from '../../../../domain/entities/expense.entity';
import {
  ExpenseListQuery,
  ExpenseRepository,
  PaginatedExpenses,
} from '../../../../domain/repositories/expense.repository';
import { ExpenseOrmEntity } from '../entities/expense.orm-entity';

@Injectable()
export class TypeOrmExpenseRepository implements ExpenseRepository {
  constructor(
    @InjectRepository(ExpenseOrmEntity)
    private readonly repository: Repository<ExpenseOrmEntity>,
  ) {}

  async save(input: CreateExpense): Promise<Expense> {
    const entity = await this.repository.save(
      this.repository.create({
        animalId: input.animalId,
        category: input.category,
        amountCents: input.amountCents,
        currency: input.currency,
        description: input.description,
        incurredAt: input.incurredAt,
        ticketMediaId: input.ticketMediaId,
        createdByUserId: input.createdByUserId,
      }),
    );

    return this.toDomain(entity);
  }

  async findById(id: string): Promise<Expense | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: ExpenseListQuery): Promise<PaginatedExpenses> {
    const where: FindOptionsWhere<ExpenseOrmEntity> = {};

    if (query.animalId) {
      where.animalId = query.animalId;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.from && query.to) {
      where.incurredAt = Between(query.from, query.to);
    } else if (query.from) {
      where.incurredAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.incurredAt = LessThanOrEqual(query.to);
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { incurredAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete({ id });
  }

  private toDomain(entity: ExpenseOrmEntity): Expense {
    return new Expense(
      entity.id,
      entity.animalId,
      entity.category,
      entity.amountCents,
      entity.currency,
      entity.description,
      entity.incurredAt,
      entity.ticketMediaId ?? null,
      entity.createdByUserId ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}