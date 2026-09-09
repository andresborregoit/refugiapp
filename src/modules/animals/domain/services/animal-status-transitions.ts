import { AnimalStatus } from '../enums/animal-status.enum';

export const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<AnimalStatus, readonly AnimalStatus[]>
> = {
  [AnimalStatus.ADMITTED]: [
    AnimalStatus.UNDER_TREATMENT,
    AnimalStatus.AVAILABLE_FOR_ADOPTION,
    AnimalStatus.DECEASED,
  ],
  [AnimalStatus.UNDER_TREATMENT]: [
    AnimalStatus.ADMITTED,
    AnimalStatus.AVAILABLE_FOR_ADOPTION,
    AnimalStatus.DECEASED,
  ],
  [AnimalStatus.AVAILABLE_FOR_ADOPTION]: [
    AnimalStatus.UNDER_TREATMENT,
    AnimalStatus.ADOPTED,
    AnimalStatus.DECEASED,
  ],
  [AnimalStatus.ADOPTED]: [],
  [AnimalStatus.DECEASED]: [],
};

export function canTransitionStatus(from: AnimalStatus, to: AnimalStatus): boolean {
  if (from === to) {
    return false;
  }

  return ALLOWED_STATUS_TRANSITIONS[from].includes(to);
}

export function getAllowedStatusTransitions(from: AnimalStatus): readonly AnimalStatus[] {
  return ALLOWED_STATUS_TRANSITIONS[from];
}
