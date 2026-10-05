import { ExpoPushAdapter } from './expo-push.adapter';

describe('ExpoPushAdapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  function buildAdapter() {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'push.expoPushUrl') return 'https://exp.host/--/api/v2/push/send';
        return 1000;
      }),
    } as never;

    return new ExpoPushAdapter(config);
  }

  it('maps ok tickets to sent results', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: { status: 'ok', id: 'receipt-1' } }),
    })) as never;

    const results = await buildAdapter().sendBatch([
      { to: 'ExponentPushToken[x]', title: 't', body: 'b', data: {} },
    ]);

    expect(results).toEqual([{ status: 'ok', receiptId: 'receipt-1' }]);
  });

  it('maps DeviceNotRegistered to invalid_token', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }),
    })) as never;

    const results = await buildAdapter().sendBatch([
      { to: 'ExponentPushToken[x]', title: 't', body: 'b', data: {} },
    ]);

    expect(results[0].status).toBe('invalid_token');
  });

  it('maps HTTP errors to transient errors without throwing', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500 })) as never;

    const results = await buildAdapter().sendBatch([
      { to: 'ExponentPushToken[x]', title: 't', body: 'b', data: {} },
    ]);

    expect(results[0]).toEqual({ status: 'transient_error', errorCode: 'EXPO_HTTP_500' });
  });
});
