import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceSubscription } from '../../domain/entities/device-subscription.entity';
import { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import { NotificationPreference } from '../../domain/entities/notification-preference.entity';

export class DeviceSubscriptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  platform!: string;

  @ApiProperty()
  timezone!: string;

  @ApiPropertyOptional({ nullable: true })
  appVersion!: string | null;

  @ApiProperty()
  tokenSuffix!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  lastSeenAt!: Date;

  static fromDomain(device: DeviceSubscription): DeviceSubscriptionResponseDto {
    const dto = new DeviceSubscriptionResponseDto();
    dto.id = device.id;
    dto.platform = device.platform;
    dto.timezone = device.timezone;
    dto.appVersion = device.appVersion;
    dto.tokenSuffix = device.tokenSuffix;
    dto.isActive = device.isActive;
    dto.lastSeenAt = device.lastSeenAt;
    return dto;
  }
}

export class NotificationPreferenceResponseDto {
  @ApiProperty()
  overdueEnabled!: boolean;

  @ApiProperty()
  upcomingEnabled!: boolean;

  @ApiProperty()
  upcomingWindowMinutes!: number;

  @ApiProperty({ nullable: true })
  quietStart!: string | null;

  @ApiProperty({ nullable: true })
  quietEnd!: string | null;

  @ApiProperty()
  timezone!: string;

  static fromDomain(preference: NotificationPreference): NotificationPreferenceResponseDto {
    const dto = new NotificationPreferenceResponseDto();
    dto.overdueEnabled = preference.overdueEnabled;
    dto.upcomingEnabled = preference.upcomingEnabled;
    dto.upcomingWindowMinutes = preference.upcomingWindowMinutes;
    dto.quietStart = preference.quietStart;
    dto.quietEnd = preference.quietEnd;
    dto.timezone = preference.timezone;
    return dto;
  }
}

export class NotificationDeliveryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  dedupKey!: string;

  @ApiProperty()
  careTaskId!: string;

  @ApiProperty()
  kind!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty({ nullable: true })
  lastErrorCode!: string | null;

  @ApiProperty()
  attemptCount!: number;

  @ApiProperty()
  createdAt!: Date;

  static fromDomain(delivery: NotificationDelivery): NotificationDeliveryResponseDto {
    const dto = new NotificationDeliveryResponseDto();
    dto.id = delivery.id;
    dto.dedupKey = delivery.dedupKey;
    dto.careTaskId = delivery.careTaskId;
    dto.kind = delivery.kind;
    dto.status = delivery.status;
    dto.lastErrorCode = delivery.lastErrorCode;
    dto.attemptCount = delivery.attemptCount;
    dto.createdAt = delivery.createdAt;
    return dto;
  }
}
