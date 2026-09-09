import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AnimalHistoryEvent } from '../../../../domain/entities/animal-history-event.entity';
import { CreateAnimalHistoryEvent } from '../../../../domain/entities/create-animal-history-event.entity';
import {
  AnimalHistoryEventListQuery,
  AnimalHistoryEventRepository,
  PaginatedAnimalHistoryEvents,
} from '../../../../domain/repositories/animal-history-event.repository';
import { AnimalHistoryEventOrmEntity } from '../entities/animal-history-event.orm-entity';

@Injectable()
export class TypeOrmAnimalHistoryEventRepository implements AnimalHistoryEventRepository {
  constructor(
    @InjectRepository(AnimalHistoryEventOrmEntity)
    private readonly repository: Repository<AnimalHistoryEventOrmEntity>,
  ) {}

  async create(input: CreateAnimalHistoryEvent): Promise<AnimalHistoryEvent> {
    const entity = await this.repository.save(
      this.repository.create({
        animalId: input.animalId,
        eventType: input.eventType,
        description: input.description,
        occurredAt: input.occurredAt,
        createdByUserId: input.createdByUserId,
        metadata: input.metadata,
      }),
    );

    return this.toDomain(entity);
  }

  async findMany(
    query: AnimalHistoryEventListQuery,
  ): Promise<PaginatedAnimalHistoryEvents> {
    const where: FindOptionsWhere<AnimalHistoryEventOrmEntity> = {
      animalId: query.animalId,
    };

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { occurredAt: 'DESC', id: 'DESC' },
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

  private toDomain(entity: AnimalHistoryEventOrmEntity): AnimalHistoryEvent {
    return new AnimalHistoryEvent(
      entity.id,
      entity.animalId,
      entity.eventType,
      entity.description,
      new Date(entity.occurredAt),
      entity.createdByUserId ?? null,
      entity.metadata ?? {},
    );
  }
}
