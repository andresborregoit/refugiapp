import { AnimalHistoryEventType } from '../enums/animal-history-event-type.enum';
import { AnimalStatus } from '../enums/animal-status.enum';

export const INTAKE_EVENT_DESCRIPTION = 'Animal admitted to the shelter.';

export function buildStatusChangeEventDescription(
  from: AnimalStatus,
  to: AnimalStatus,
): string {
  return `Status changed from ${from} to ${to}.`;
}

export class AnimalHistoryEvent {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly eventType: AnimalHistoryEventType,
    public readonly description: string,
    public readonly occurredAt: Date,
    public readonly createdByUserId: string | null = null,
    public readonly metadata: Record<string, unknown> = {},
  ) {}
}
