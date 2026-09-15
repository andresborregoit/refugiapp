import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  rateLimit: {
    general: {
      limit: Number(process.env.RATE_LIMIT_GENERAL_LIMIT ?? 100),
      ttlMs: Number(process.env.RATE_LIMIT_GENERAL_TTL_MS ?? 60000),
    },
    login: {
      limit: Number(process.env.RATE_LIMIT_LOGIN_LIMIT ?? 5),
      ttlMs: Number(process.env.RATE_LIMIT_LOGIN_TTL_MS ?? 60000),
    },
  },
}));
