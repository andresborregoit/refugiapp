import { AnimalSex } from '../enums/animal-sex.enum';

export class UpdateAnimal {
  constructor(
    public readonly name?: string,
    public readonly species?: string,
    public readonly breed?: string | null,
    public readonly sex?: AnimalSex,
    public readonly intakeDate?: Date,
    public readonly birthDate?: Date | null,
    public readonly profilePhotoMediaId?: string | null,
  ) {}
}
