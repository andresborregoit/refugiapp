import { NotificationPreference } from '../entities/notification-preference.entity';

export interface UpdatePreferencesInput {
  overdueEnabled: boolean;
  upcomingEnabled: boolean;
  upcomingWindowMinutes: number;
  quietStart: string | null;
  quietEnd: string | null;
  timezone: string;
}

export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol('NOTIFICATION_PREFERENCE_REPOSITORY');

export interface NotificationPreferenceRepository {
  findByUserId(userId: string): Promise<NotificationPreference | null>;
  upsert(userId: string, input: UpdatePreferencesInput): Promise<NotificationPreference>;
}
