import { CareTaskStatus } from '../enums/care-task-status.enum';

export class CareTask {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly status: CareTaskStatus,
    public readonly dueAt: Date | null,
    public readonly completedAt: Date | null,
    public readonly createdByUserId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}