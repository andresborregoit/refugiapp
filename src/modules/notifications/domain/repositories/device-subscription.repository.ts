import { DevicePlatform } from '../enums/device-platform.enum';
import { DeviceSubscription } from '../entities/device-subscription.entity';

export interface RegisterDeviceInput {
  userId: string;
  expoPushToken: string;
  tokenHash: string;
  tokenSuffix: string;
  platform: DevicePlatform;
  timezone: string;
  appVersion?: string | null;
}

export interface DeviceToken {
  subscriptionId: string;
  tokenHash: string;
  expoPushToken: string;
  timezone: string;
}

export const DEVICE_SUBSCRIPTION_REPOSITORY = Symbol('DEVICE_SUBSCRIPTION_REPOSITORY');

export interface DeviceSubscriptionRepository {
  findById(id: string): Promise<DeviceSubscription | null>;
  findByTokenHash(tokenHash: string): Promise<DeviceSubscription | null>;
  findActiveByUserId(userId: string): Promise<DeviceSubscription[]>;
  findActiveTokensByUserId(userId: string): Promise<DeviceToken[]>;
  upsert(input: RegisterDeviceInput): Promise<DeviceSubscription>;
  deactivate(id: string, userId: string): Promise<DeviceSubscription | null>;
  deactivateByTokenHash(tokenHash: string): Promise<number>;
}
