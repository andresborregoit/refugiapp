import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CareTask } from '../../../../domain/entities/care-task.entity';
import { CreateCareTask } from '../../../../domain/entities/create-care-task.entity';
import { UpdateCareTask } from '../../../../domain/entities/update-care-task.entity';
import { CareTaskStatus } from '../../../../domain/enums/care-task-status.enum';
import {
  CareTaskListQuery,
  CareTaskRepository,
  PaginatedCareTasks,
} from '../../../../domain/repositories/care-task.repository';
import { CareTaskOrmEntity } from '../entities/care-task.orm-entity';

@Injectable()
export class TypeOrmCareTaskRepository implements CareTaskRepository {
  constructor(
    @InjectRepository(CareTaskOrmEntity)
    private readonly repository: Repository<CareTaskOrmEntity>,
  ) {}

  async findById(id: string): Promise<CareTask | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: CareTaskListQuery): Promise<PaginatedCareTasks> {
    const where: FindOptionsWhere<CareTaskOrmEntity> = {};

    if (query.animalId) {
      where.animalId = query.animalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
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

  async create(input: CreateCareTask): Promise<CareTask> {
    const entity = await this.repository.save(
      this.repository.create({
        animalId: input.animalId,
        title: input.title,
        description: input.description,
        status: CareTaskStatus.PENDING,
        dueAt: input.dueAt,
        completedAt: null,
        createdByUserId: input.createdByUserId,
      }),
    );

    return this.toDomain(entity);
  }

  async update(id: string, input: UpdateCareTask): Promise<CareTask | null> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(CareTaskOrmEntity, { where: { id } });

      if (!entity) {
        return null;
      }

      if (input.title !== undefined) {
        entity.title = input.title;
      }

      if (input.description !== undefined) {
        entity.description = input.description;
      }

      if (input.dueAt !== undefined) {
        entity.dueAt = input.dueAt;
      }

      const saved = await manager.save(CareTaskOrmEntity, entity);

      return this.toDomain(saved);
    });
  }

  async complete(id: string): Promise<CareTask | null> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(CareTaskOrmEntity, { where: { id } });

      if (!entity) {
        return null;
      }

      entity.status = CareTaskStatus.COMPLETED;
      entity.completedAt = new Date();

      const saved = await manager.save(CareTaskOrmEntity, entity);

      return this.toDomain(saved);
    });
  }

  async cancel(id: string): Promise<CareTask | null> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(CareTaskOrmEntity, { where: { id } });

      if (!entity) {
        return null;
      }

      entity.status = CareTaskStatus.CANCELLED;

      const saved = await manager.save(CareTaskOrmEntity, entity);

      return this.toDomain(saved);
    });
  }

  private toDomain(entity: CareTaskOrmEntity): CareTask {
    return new CareTask(
      entity.id,
      entity.animalId,
      entity.title,
      entity.description ?? null,
      entity.status,
      entity.dueAt ?? null,
      entity.completedAt ?? null,
      entity.createdByUserId ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}