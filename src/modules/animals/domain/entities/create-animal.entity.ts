import { AnimalSex } from '../enums/animal-sex.enum';
import { AnimalStatus } from '../enums/animal-status.enum';

export class CreateAnimal {
  constructor(
    public readonly name: string,
    public readonly species: string,
    public readonly breed: string | null,
    public readonly sex: AnimalSex,
    public readonly status: AnimalStatus,
    public readonly intakeDate: Date,
    public readonly birthDate: Date | null = null,
    public readonly notes: string | null = null,
    public readonly profilePhotoMediaId: string | null = null,
    public readonly createdByUserId: string | null = null,
  ) {}
}
