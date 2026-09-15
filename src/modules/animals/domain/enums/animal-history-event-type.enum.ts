export enum AnimalHistoryEventType {
  INTAKE = 'intake',
  TRANSFER = 'transfer',
  STATUS_CHANGE = 'status_change',
  BEHAVIOR_NOTE = 'behavior_note',
  ADOPTION = 'adoption',
  GENERAL_NOTE = 'general_note',
}

export const MANUAL_ANIMAL_HISTORY_EVENT_TYPES: readonly AnimalHistoryEventType[] = [
  AnimalHistoryEventType.GENERAL_NOTE,
  AnimalHistoryEventType.BEHAVIOR_NOTE,
  AnimalHistoryEventType.TRANSFER,
] as const;
