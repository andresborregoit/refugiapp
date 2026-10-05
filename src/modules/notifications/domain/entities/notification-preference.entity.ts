export class NotificationPreference {
  constructor(
    public readonly userId: string,
    public readonly overdueEnabled: boolean,
    public readonly upcomingEnabled: boolean,
    public readonly upcomingWindowMinutes: number,
    public readonly quietStart: string | null,
    public readonly quietEnd: string | null,
    public readonly timezone: string,
    public readonly updatedAt: Date,
  ) {}
}
