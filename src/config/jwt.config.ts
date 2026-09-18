import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  issuer: process.env.JWT_ISSUER ?? 'refugiapp-api',
  audience: process.env.JWT_AUDIENCE ?? 'refugiapp-mobile',
  refreshTokenTtlMs: Number(process.env.JWT_REFRESH_TOKEN_TTL_MS ?? 7 * 24 * 60 * 60 * 1000),
  refreshReuseGraceMs: Number(process.env.JWT_REFRESH_REUSE_GRACE_MS ?? 30 * 1000),
}));
