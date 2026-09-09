import { AnimalStatus } from '../enums/animal-status.enum';

export class ChangeAnimalStatus {
  constructor(
    public readonly animalId: string,
    public readonly from: AnimalStatus,
    public readonly to: AnimalStatus,
    public readonly occurredAt: Date,
    public readonly actorId: string,
  ) {}
}
