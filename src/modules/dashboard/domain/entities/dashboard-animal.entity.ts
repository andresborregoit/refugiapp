import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';

export class DashboardAnimal {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly species: string,
    public readonly status: AnimalStatus,
    public readonly profilePhotoMediaId: string | null,
  ) {}
}