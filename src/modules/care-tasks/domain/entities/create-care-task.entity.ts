export class CreateCareTask {
  constructor(
    public readonly animalId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly dueAt: Date | null,
    public readonly createdByUserId: string,
  ) {}
}