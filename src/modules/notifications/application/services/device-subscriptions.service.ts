import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { DeviceSubscription } from '../../domain/entities/device-subscription.entity';
import { DevicePlatform } from '../../domain/enums/device-platform.enum';
import {
  DEVICE_SUBSCRIPTION_REPOSITORY,
  DeviceSubscriptionRepository,
} from '../../domain/repositories/device-subscription.repository';
import { hashPushToken } from '../../domain/services/notification-dedup-key';

const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/;

export interface RegisterDeviceArgs {
  expoPushToken: string;
  platform: DevicePlatform;
  timezone: string;
  appVersion?: string | null;
}

@Injectable()
export class DeviceSubscriptionsService {
  constructor(
    @Inject(DEVICE_SUBSCRIPTION_REPOSITORY)
    private readonly devices: DeviceSubscriptionRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(userId: string, args: RegisterDeviceArgs): Promise<DeviceSubscription> {
    const token = args.expoPushToken.trim();

    if (!EXPO_TOKEN_PATTERN.test(token)) {
      throw new BadRequestException({
        code: 'INVALID_PUSH_TOKEN',
        message: 'expoPushToken must be a valid Expo push token.',
      });
    }

    if (!this.isValidTimezone(args.timezone)) {
      throw new BadRequestException({
        code: 'INVALID_TIMEZONE',
        message: 'timezone must be a valid IANA timezone.',
      });
    }

    const { tokenHash, tokenSuffix } = hashPushToken(token);
    const subscription = await this.devices.upsert({
      userId,
      expoPushToken: token,
      tokenHash,
      tokenSuffix,
      platform: args.platform,
      timezone: args.timezone,
      appVersion: args.appVersion ?? null,
    });

    await this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.PUSH_DEVICE_REGISTER,
      resourceType: AuditResourceType.NOTIFICATION,
      resourceId: subscription.id,
      metadata: { platform: subscription.platform, tokenSuffix: subscription.tokenSuffix },
    });

    return subscription;
  }

  async remove(userId: string, deviceId: string): Promise<void> {
    const removed = await this.devices.deactivate(deviceId, userId);

    if (!removed) {
      throw new ResourceNotFoundException('DeviceSubscription', deviceId);
    }

    await this.auditLogsService.record({
      actorUserId: userId,
      action: AuditAction.PUSH_DEVICE_REMOVE,
      resourceType: AuditResourceType.NOTIFICATION,
      resourceId: deviceId,
      metadata: { tokenSuffix: removed.tokenSuffix },
    });
  }

  async listMine(userId: string): Promise<DeviceSubscription[]> {
    return this.devices.findActiveByUserId(userId);
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
