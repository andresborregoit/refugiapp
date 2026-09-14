import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { assertMediaLinkable } from '../../../media/application/services/media-linker';
import { MEDIA_ASSET_REPOSITORY, MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { MediaLinkingContext } from '../../../media/domain/services/media-owner-policy';
import { CreateExpense } from '../../domain/entities/create-expense.entity';
import { Expense } from '../../domain/entities/expense.entity';
import {
  EXPENSE_REPOSITORY,
  ExpenseListQuery,
  ExpenseRepository,
  PaginatedExpenses,
} from '../../domain/repositories/expense.repository';
import { CreateExpenseDto } from '../../interfaces/dto/create-expense.dto';
import { ListExpensesQueryDto } from '../../interfaces/dto/list-expenses.query.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(EXPENSE_REPOSITORY)
    private readonly expenseRepository: ExpenseRepository,
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateExpenseDto, actorId: string): Promise<Expense> {
    const animal = await this.animalRepository.findById(dto.animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', dto.animalId);
    }

    const ticketMediaId = dto.ticketMediaId ?? null;

    if (ticketMediaId) {
      const asset = await this.mediaAssetRepository.findById(ticketMediaId);

      if (!asset) {
        throw new ResourceNotFoundException('MediaAsset', ticketMediaId);
      }

      assertMediaLinkable(asset, MediaLinkingContext.EXPENSE_TICKET);
    }

    const input = new CreateExpense(
      dto.animalId,
      dto.category,
      dto.amountCents,
      dto.currency.trim(),
      dto.description.trim(),
      new Date(dto.incurredAt),
      actorId,
      ticketMediaId,
    );

    const created = await this.expenseRepository.save(input);

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.EXPENSE_CREATE,
      resourceType: AuditResourceType.EXPENSE,
      resourceId: created.id,
      metadata: {
        animalId: created.animalId,
        category: created.category,
        amountCents: created.amountCents,
        currency: created.currency,
      },
    });

    return created;
  }

  async findById(id: string): Promise<Expense> {
    const expense = await this.expenseRepository.findById(id);

    if (!expense) {
      throw new ResourceNotFoundException('Expense', id);
    }

    return expense;
  }

  async list(query: ListExpensesQueryDto): Promise<PaginatedExpenses> {
    const repositoryQuery = this.toRepositoryQuery(query);

    return this.expenseRepository.findMany(repositoryQuery);
  }

  async listByAnimal(animalId: string, query: ListExpensesQueryDto): Promise<PaginatedExpenses> {
    const animal = await this.animalRepository.findById(animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', animalId);
    }

    const repositoryQuery: ExpenseListQuery = {
      ...this.toRepositoryQuery(query),
      animalId,
    };

    return this.expenseRepository.findMany(repositoryQuery);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const expense = await this.expenseRepository.findById(id);

    if (!expense) {
      throw new ResourceNotFoundException('Expense', id);
    }

    await this.expenseRepository.softDelete(id);

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.EXPENSE_SOFT_DELETE,
      resourceType: AuditResourceType.EXPENSE,
      resourceId: id,
      metadata: {
        animalId: expense.animalId,
      },
    });
  }

  private toRepositoryQuery(query: ListExpensesQueryDto): ExpenseListQuery {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'from must be less than or equal to to.',
      });
    }

    return {
      page: query.page,
      limit: query.limit,
      animalId: query.animalId,
      category: query.category,
      from,
      to,
    };
  }
}