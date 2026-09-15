import { registerAs } from '@nestjs/config';

export const throttleConfig = registerAs('throttle', () => ({
  generalTtlMs: Number(process.env.THROTTLE_GENERAL_TTL_MS ?? 60000),
  generalLimit: Number(process.env.THROTTLE_GENERAL_LIMIT ?? 100),
  loginTtlMs: Number(process.env.THROTTLE_LOGIN_TTL_MS ?? 60000),
  loginLimit: Number(process.env.THROTTLE_LOGIN_LIMIT ?? 5),
  errorMessage:
    process.env.THROTTLE_ERROR_MESSAGE ??
    'Too many requests. Please try again later.',
}));