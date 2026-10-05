import { DevicePlatform } from '../enums/device-platform.enum';

export class DeviceSubscription {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tokenHash: string,
    public readonly tokenSuffix: string,
    public readonly platform: DevicePlatform,
    public readonly timezone: string,
    public readonly appVersion: string | null,
    public readonly isActive: boolean,
    public readonly lastSeenAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
