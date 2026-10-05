import { ConfigService } from '@nestjs/config';
import { NotificationDispatchService } from './notification-dispatch.service';
import { NotificationKind } from '../../domain/enums/notification-kind.enum';
import { FakePushAdapter } from '../../infrastructure/push/fake-push.adapter';

describe('NotificationDispatchService', () => {
  const now = new Date('2026-11-01T12:00:00Z');

  function buildService(deps: {
    tasks: { id: string; title: string; animalId: string; dueAt: Date | null; status: string }[];
    users: { id: string }[];
    preferencesByUser?: Record<string, unknown>;
    tokensByUser?: Record<
      string,
      { subscriptionId: string; expoPushToken: string; timezone: string }[]
    >;
    sendScript?: {
      status: 'ok' | 'invalid_token' | 'transient_error';
      receiptId?: string;
      errorCode?: string;
    }[];
  }) {
    const deliveries = new Map<string, { id: string; dedupKey: string }>();
    const fakePush = new FakePushAdapter(deps.sendScript ?? []);
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'push.dispatchLimit') return 200;
        if (key === 'push.dryRun') return false;
        if (key === 'push.upcomingWindowMinutes') return 60;
        if (key === 'push.provider') return 'noop';
        return fallback;
      }),
    } as unknown as ConfigService;

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        const name = (entity as { name?: string }).name ?? '';

        if (name.includes('CareTask')) {
          return {
            createQueryBuilder: () => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              addOrderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(deps.tasks),
            }),
          };
        }

        return {
          createQueryBuilder: () => ({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawMany: jest.fn().mockResolvedValue(deps.users),
          }),
        };
      }),
    } as never;

    const devices = {
      findActiveTokensByUserId: jest.fn(
        async (userId: string) => deps.tokensByUser?.[userId] ?? [],
      ),
      deactivateByTokenHash: jest.fn(async () => 1),
    };

    const preferences = {
      findByUserId: jest.fn(async (userId: string) => deps.preferencesByUser?.[userId] ?? null),
    };

    const deliveryStore = {
      insertIfNotExists: jest.fn(async (input: { dedupKey: string }) => {
        const existing = deliveries.get(input.dedupKey);

        if (existing) {
          return { delivery: { id: existing.id, ...input }, inserted: false };
        }

        const created = { id: `del-${deliveries.size + 1}`, ...input };
        deliveries.set(input.dedupKey, created);

        return { delivery: created, inserted: true };
      }),
      markSent: jest.fn(async () => undefined),
      markFailed: jest.fn(async () => undefined),
      markSkipped: jest.fn(async () => undefined),
      findMany: jest.fn(),
    };

    const audit = { record: jest.fn(async () => ({})) };

    const service = new NotificationDispatchService(
      dataSource,
      devices as any,
      preferences as any,
      deliveryStore as any,
      fakePush,
      config,
      audit as any,
    );

    return { service, fakePush, deliveryStore, devices, audit };
  }

  it('sends overdue tasks once and dedupes on retry', async () => {
    const task = {
      id: 'task-1',
      title: 'Feed',
      animalId: 'animal-1',
      dueAt: new Date('2026-11-01T11:00:00Z'),
      status: 'pending',
    };
    const { service, deliveryStore, fakePush } = buildService({
      tasks: [task],
      users: [{ id: 'user-1' }],
      tokensByUser: {
        'user-1': [
          { subscriptionId: 'dev-1', expoPushToken: 'ExponentPushToken[x]', timezone: 'UTC' },
        ],
      },
    });

    const first = await service.dispatch({ now });
    const second = await service.dispatch({ now });

    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(fakePush.sent).toHaveLength(1);
    expect(deliveryStore.markSent).toHaveBeenCalledTimes(1);
  });

  it('skips tasks inside quiet hours without calling the provider', async () => {
    const task = {
      id: 'task-2',
      title: 'Walk',
      animalId: 'animal-1',
      dueAt: new Date('2026-11-01T11:00:00Z'),
      status: 'pending',
    };
    const { service, fakePush } = buildService({
      tasks: [task],
      users: [{ id: 'user-1' }],
      preferencesByUser: {
        'user-1': {
          overdueEnabled: true,
          upcomingEnabled: true,
          upcomingWindowMinutes: 60,
          quietStart: '00:00',
          quietEnd: '23:59',
          timezone: 'UTC',
        },
      },
      tokensByUser: {
        'user-1': [
          { subscriptionId: 'dev-1', expoPushToken: 'ExponentPushToken[x]', timezone: 'UTC' },
        ],
      },
    });

    const result = await service.dispatch({ now });

    expect(result.sent).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
    expect(fakePush.sent).toHaveLength(0);
  });

  it('deactivates tokens rejected by the provider without blocking the batch', async () => {
    const task = {
      id: 'task-3',
      title: 'Medicate',
      animalId: 'animal-1',
      dueAt: new Date('2026-11-01T11:00:00Z'),
      status: 'pending',
    };
    const { service, devices, deliveryStore } = buildService({
      tasks: [task],
      users: [{ id: 'user-1' }],
      tokensByUser: {
        'user-1': [
          { subscriptionId: 'dev-1', expoPushToken: 'ExponentPushToken[bad]', timezone: 'UTC' },
        ],
      },
      sendScript: [{ status: 'invalid_token', errorCode: 'EXPO_DEVICE_NOT_REGISTERED' }],
    });

    const result = await service.dispatch({ now });

    expect(result.failed).toBe(1);
    expect(result.invalidTokens).toBe(1);
    expect(devices.deactivateByTokenHash).toHaveBeenCalled();
    expect(deliveryStore.markFailed).toHaveBeenCalledWith(
      expect.any(String),
      'EXPO_DEVICE_NOT_REGISTERED',
    );
  });

  it('selects upcoming tasks within the window', async () => {
    const upcoming = {
      id: 'task-4',
      title: 'Clean',
      animalId: 'animal-1',
      dueAt: new Date('2026-11-01T12:30:00Z'),
      status: 'pending',
    };
    const { service } = buildService({
      tasks: [upcoming],
      users: [{ id: 'user-1' }],
      tokensByUser: {
        'user-1': [
          { subscriptionId: 'dev-1', expoPushToken: 'ExponentPushToken[x]', timezone: 'UTC' },
        ],
      },
    });

    const result = await service.dispatch({ now });

    expect(result.queued).toBe(1);
    expect(result.sent).toBe(1);
    expect(NotificationKind.UPCOMING).toBe('upcoming');
  });
});
