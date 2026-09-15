import { registerAs } from '@nestjs/config';

export const healthConfig = registerAs('health', () => ({
  dbTimeoutMs: Number(process.env.HEALTH_DB_TIMEOUT_MS ?? 2000),
  degradedLatencyMs: Number(process.env.HEALTH_DEGRADED_LATENCY_MS ?? 500),
}));