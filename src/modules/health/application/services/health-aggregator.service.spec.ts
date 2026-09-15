import { HealthAggregatorService } from './health-aggregator.service';

describe('HealthAggregatorService', () => {
  const service = new HealthAggregatorService();

  it('returns ok when every component is up', async () => {
    const result = await service.check([
      () => ({ app: { status: 'up' } }),
      () => ({ database: { status: 'up' } }),
    ]);

    expect(result.status).toBe('ok');
    expect(result.error).toBeUndefined();
    expect(result.details).toEqual({
      app: { status: 'up' },
      database: { status: 'up' },
    });
  });

  it('returns degraded when a component responds with degraded status', async () => {
    const result = await service.check([
      () => ({ app: { status: 'up' } }),
      () => ({ database: { status: 'degraded', latencyMs: 800 } }),
    ]);

    expect(result.status).toBe('degraded');
    expect(result.info).toEqual({
      app: { status: 'up' },
      database: { status: 'degraded', latencyMs: 800 },
    });
    expect(result.error).toBeUndefined();
  });

  it('returns error when a component is down', async () => {
    const result = await service.check([
      () => ({ app: { status: 'up' } }),
      () => ({ database: { status: 'down' } }),
    ]);

    expect(result.status).toBe('error');
    expect(result.error).toEqual({ database: { status: 'down' } });
    expect(result.info).toEqual({ app: { status: 'up' } });
  });
});