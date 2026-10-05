import { AdoptionApplicationStatus } from '../enums/adoption-application-status.enum';

export class AdoptionApplication {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly adopterId: string,
    public readonly status: AdoptionApplicationStatus,
    public readonly submittedAt: Date,
    public readonly createdByUserId: string | null,
    public readonly decidedAt: Date | null,
    public readonly decidedByUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
