import { AnimalHistoryEvent } from '../entities/animal-history-event.entity';
import { CreateAnimalHistoryEvent } from '../entities/create-animal-history-event.entity';
import { AnimalHistoryEventType } from '../enums/animal-history-event-type.enum';

export const ANIMAL_HISTORY_EVENT_REPOSITORY = Symbol('ANIMAL_HISTORY_EVENT_REPOSITORY');

export interface AnimalHistoryEventListQuery {
  animalId: string;
  page: number;
  limit: number;
  eventType?: AnimalHistoryEventType;
}

export interface PaginatedAnimalHistoryEvents {
  items: AnimalHistoryEvent[];
  page: number;
  limit: number;
  total: number;
}

export interface AnimalHistoryEventRepository {
  create(input: CreateAnimalHistoryEvent): Promise<AnimalHistoryEvent>;
  findMany(query: AnimalHistoryEventListQuery): Promise<PaginatedAnimalHistoryEvents>;
}
