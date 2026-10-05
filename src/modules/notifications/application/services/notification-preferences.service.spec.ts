import { NotificationPreferencesService } from './notification-preferences.service';

describe('NotificationPreferencesService', () => {
  const preferences = { findByUserId: jest.fn(), upsert: jest.fn() };
  const audit = { record: jest.fn() };
  let service: NotificationPreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationPreferencesService(preferences as never, audit as never);
  });

  it('creates defaults on first read', async () => {
    preferences.findByUserId.mockResolvedValue(null);
    preferences.upsert.mockImplementation(async (_userId: string, input: unknown) => ({
      userId: 'user-1',
      ...(input as object),
      updatedAt: new Date(),
    }));

    const result = await service.getMine('user-1');

    expect(preferences.upsert).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ overdueEnabled: true, upcomingWindowMinutes: 60 }),
    );
    expect(result.timezone).toBe('America/Argentina/Buenos_Aires');
  });

  it('rejects partial quiet hours', async () => {
    preferences.findByUserId.mockResolvedValue({
      userId: 'user-1',
      overdueEnabled: true,
      upcomingEnabled: true,
      upcomingWindowMinutes: 60,
      quietStart: null,
      quietEnd: null,
      timezone: 'America/Argentina/Buenos_Aires',
      updatedAt: new Date(),
    });

    await expect(
      service.updateMine('user-1', { quietStart: '22:00' } as never),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_QUIET_HOURS' }),
    });
  });
});
