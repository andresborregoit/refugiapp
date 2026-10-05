export class Adoption {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly adopterId: string,
    public readonly applicationId: string,
    public readonly adoptedAt: Date,
    public readonly responsibleUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
