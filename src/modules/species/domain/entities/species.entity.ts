export class Species {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly labelEs: string,
    public readonly isActive: boolean,
    public readonly sortOrder: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}