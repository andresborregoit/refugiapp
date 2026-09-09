import { AnimalHistoryEventType } from '../enums/animal-history-event-type.enum';

export class CreateAnimalHistoryEvent {
  constructor(
    public readonly animalId: string,
    public readonly eventType: AnimalHistoryEventType,
    public readonly description: string,
    public readonly occurredAt: Date,
    public readonly createdByUserId: string,
    public readonly metadata: Record<string, unknown> = {},
  ) {}
}
