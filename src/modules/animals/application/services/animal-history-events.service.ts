import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { AnimalHistoryEventType } from '../../domain/enums/animal-history-event-type.enum';
import {
  ANIMAL_HISTORY_EVENT_REPOSITORY,
  AnimalHistoryEventListQuery,
  AnimalHistoryEventRepository,
  PaginatedAnimalHistoryEvents,
} from '../../domain/repositories/animal-history-event.repository';
import {
  ANIMAL_REPOSITORY,
  AnimalRepository,
} from '../../domain/repositories/animal.repository';
import { AnimalHistoryEvent } from '../../domain/entities/animal-history-event.entity';
import { CreateAnimalHistoryEvent } from '../../domain/entities/create-animal-history-event.entity';
import { resolveEventOccurredAt } from '../../domain/services/animal-event-date';
import { mapDomainExceptionToBadRequest } from '../../../../common/mappers/domain-to-http-exception.mapper';

@Injectable()
export class AnimalHistoryEventsService {
  constructor(
    @Inject(ANIMAL_HISTORY_EVENT_REPOSITORY)
    private readonly eventRepository: AnimalHistoryEventRepository,
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
  ) {}

  async create(
    animalId: string,
    eventType: AnimalHistoryEventType,
    description: string,
    actorId: string,
    occurredAt?: string,
  ): Promise<AnimalHistoryEvent> {
    const animal = await this.animalRepository.findById(animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', animalId);
    }

    let resolvedOccurredAt: Date;

    try {
      resolvedOccurredAt = resolveEventOccurredAt(occurredAt, animal.intakeDate, new Date());
    } catch (error) {
      if (error instanceof DomainException) {
        throw mapDomainExceptionToBadRequest(error);
      }

      throw error;
    }

    const input = new CreateAnimalHistoryEvent(
      animalId,
      eventType,
      description.trim(),
      resolvedOccurredAt,
      actorId,
      {},
    );

    return this.eventRepository.create(input);
  }

  async list(query: AnimalHistoryEventListQuery): Promise<PaginatedAnimalHistoryEvents> {
    const animal = await this.animalRepository.findById(query.animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', query.animalId);
    }

    return this.eventRepository.findMany(query);
  }
}
