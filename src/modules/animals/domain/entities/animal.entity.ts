import { AnimalSex } from '../enums/animal-sex.enum';
import { AnimalStatus } from '../enums/animal-status.enum';

export class Animal {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly species: string,
    public readonly sex: AnimalSex,
    public readonly status: AnimalStatus,
    public readonly intakeDate: Date,
  ) {}
}
