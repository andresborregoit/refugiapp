export class UpdateCareTask {
  constructor(
    public readonly title?: string,
    public readonly description?: string | null,
    public readonly dueAt?: Date | null,
  ) {}
}