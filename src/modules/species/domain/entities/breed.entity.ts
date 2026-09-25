export class Breed {
  constructor(
    public readonly id: string,
    public readonly speciesId: string,
    public readonly slug: string,
    public readonly labelEs: string,
    public readonly isActive: boolean,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}