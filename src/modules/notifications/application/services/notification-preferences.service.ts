import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NotificationPreferenceRepository,
} from '../../domain/repositories/notification-preference.repository';
import { parseQuietTime } from '../../domain/services/notification-selection-rules';

export const DEFAULT_NOTIFICATION_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEFAULT_UPCOMING_WINDOW_MINUTES = 60;

export interface UpdatePreferencesArgs {
  overdueEnabled?: boolean;
  upcomingEnabled?: boolean;
  upcomingWindowMinutes?: number;
  quietStart?: string | null;
  quietEnd?: string | null;
  timezone?: string;
}

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getMine(userId: string): Promise<NotificationPreference> {
    const existing = await this.preferences.findByUserId(userId);

    if (existing) {
      return existing;
    }

    return this.preferences.upsert(userId, {
      overdueEnabled: true,
      upcomingEnabled: true,
      upcomingWindowMinutes: DEFAULT_UPCOMING_WINDOW_MINUTES,
      quietStart: null,
      quietEnd: null,
      timezone: DEFAULT_NOTIFICATION_TIMEZONE,
    });
  }

  async updateMine(userId: string, args: UpdatePreferencesArgs): Promise<NotificationPreference> {
    const current = await this.getMine(userId);

    const quietStart = args.quietStart === undefined ? current.quietStart : args.quietStart;
    const quietEnd = args.quietEnd === undefined ? current.quietEnd : args.quietEnd;
    const timezone = args.timezone ?? current.timezone;

    this.assertValidTimezone(timezone);
    this.assertValidQuietRange(quietStart, quietEnd);

    const windowMinutes = args.upcomingWindowMinutes ?? current.upcomingWindowMinutes;

    if (!Number.isInteger(windowMinutes) || windowMinutes < 5 || windowMinutes > 1440) {
      throw new BadRequestException({
        code: 'INVALID_UPCOMING_WINDOW',
        message: 'upcomingWindowMinutes must be an integer between 5 and 1440.',
      });
    }

    const updated = await this.preferences.upsert(userId, {
      overdueEnabled: args.overdueEnabled ?? current.overdueEnabled,
      upcomingEnabled: args.upcomingEnabled ?? current.upcomingEnabled,
      upcomingWindowMinutes: windowMinutes,
      quietStart,
      quietEnd,
      timezone,
    });

    await this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.PUSH_PREFERENCES_UPDATE,
      resourceType: AuditResourceType.NOTIFICATION,
      resourceId: userId,
      metadata: {
        overdueEnabled: updated.overdueEnabled,
        upcomingEnabled: updated.upcomingEnabled,
        upcomingWindowMinutes: updated.upcomingWindowMinutes,
      },
    });

    return updated;
  }

  private assertValidTimezone(timezone: string): void {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
    } catch {
      throw new BadRequestException({
        code: 'INVALID_TIMEZONE',
        message: 'timezone must be a valid IANA timezone.',
      });
    }
  }

  private assertValidQuietRange(quietStart: string | null, quietEnd: string | null): void {
    const startSet = quietStart !== null && quietStart !== undefined;
    const endSet = quietEnd !== null && quietEnd !== undefined;

    if (startSet !== endSet) {
      throw new BadRequestException({
        code: 'INVALID_QUIET_HOURS',
        message: 'quietStart and quietEnd must be provided together or omitted.',
      });
    }

    if (!startSet || !endSet) {
      return;
    }

    if (!parseQuietTime(quietStart) || !parseQuietTime(quietEnd)) {
      throw new BadRequestException({
        code: 'INVALID_QUIET_HOURS',
        message: 'quietStart and quietEnd must use HH:mm 24h format.',
      });
    }
  }
}
