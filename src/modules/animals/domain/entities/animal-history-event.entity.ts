import { AnimalHistoryEventType } from '../enums/animal-history-event-type.enum';

export class AnimalHistoryEvent {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly eventType: AnimalHistoryEventType,
    public readonly description: string,
    public readonly occurredAt: Date,
  ) {}
}
