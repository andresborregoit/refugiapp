import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_PROFILE_METADATA = 'rateLimitProfile';

export const RATE_LIMIT_PROFILES = {
  GENERAL: 'general',
  LOGIN: 'login',
} as const;

export type RateLimitProfile = (typeof RATE_LIMIT_PROFILES)[keyof typeof RATE_LIMIT_PROFILES];

export const UseRateLimitProfile = (profile: RateLimitProfile): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_PROFILE_METADATA, profile);
