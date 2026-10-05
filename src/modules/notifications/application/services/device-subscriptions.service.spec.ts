import { BadRequestException } from '@nestjs/common';
import { DeviceSubscriptionsService } from './device-subscriptions.service';
import { DevicePlatform } from '../../domain/enums/device-platform.enum';

describe('DeviceSubscriptionsService', () => {
  const devices = {
    upsert: jest.fn(),
    deactivate: jest.fn(),
    findActiveByUserId: jest.fn(),
    findById: jest.fn(),
    findByTokenHash: jest.fn(),
    deactivateByTokenHash: jest.fn(),
    findActiveTokensByUserId: jest.fn(),
  };
  const audit = { record: jest.fn() };
  let service: DeviceSubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeviceSubscriptionsService(devices as never, audit as never);
  });

  it('registers a valid Expo token and audits without the cleartext token', async () => {
    const subscription = { id: 'dev-1', tokenSuffix: 'abcdef' };
    devices.upsert.mockResolvedValue(subscription);

    const result = await service.register('user-1', {
      expoPushToken: 'ExponentPushToken[abcdef]',
      platform: DevicePlatform.ANDROID,
      timezone: 'America/Argentina/Buenos_Aires',
    });

    expect(result).toBe(subscription);
    expect(devices.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', tokenSuffix: 'bcdef]' }),
    );
    const metadata = audit.record.mock.calls[0][0].metadata;
    expect(JSON.stringify(metadata)).not.toContain('ExponentPushToken');
  });

  it('rejects malformed tokens and timezones', async () => {
    await expect(
      service.register('user-1', {
        expoPushToken: 'not-a-token',
        platform: DevicePlatform.IOS,
        timezone: 'America/Argentina/Buenos_Aires',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.register('user-1', {
        expoPushToken: 'ExponentPushToken[abcdef]',
        platform: DevicePlatform.IOS,
        timezone: 'Mars/Olympus',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
