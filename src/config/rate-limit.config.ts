import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import {
  RATE_LIMIT_PROFILE_METADATA,
  RATE_LIMIT_PROFILES,
  RateLimitProfile,
} from '../common/decorators/rate-limit-profile.decorator';

const RATE_LIMIT_ERROR_MESSAGE = 'Too many requests. Please try again later.';

export function createRateLimitOptions(configService: ConfigService): ThrottlerModuleOptions {
  return {
    errorMessage: RATE_LIMIT_ERROR_MESSAGE,
    throttlers: [
      {
        name: RATE_LIMIT_PROFILES.GENERAL,
        limit: configService.get<number>('security.rateLimit.general.limit', 100),
        ttl: configService.get<number>('security.rateLimit.general.ttlMs', 60000),
        skipIf: (context) => getRateLimitProfile(context) !== RATE_LIMIT_PROFILES.GENERAL,
      },
      {
        name: RATE_LIMIT_PROFILES.LOGIN,
        limit: configService.get<number>('security.rateLimit.login.limit', 5),
        ttl: configService.get<number>('security.rateLimit.login.ttlMs', 60000),
        skipIf: (context) => getRateLimitProfile(context) !== RATE_LIMIT_PROFILES.LOGIN,
      },
    ],
  };
}

function getRateLimitProfile(context: ExecutionContext): RateLimitProfile {
  return (
    Reflect.getMetadata(RATE_LIMIT_PROFILE_METADATA, context.getHandler()) ??
    Reflect.getMetadata(RATE_LIMIT_PROFILE_METADATA, context.getClass()) ??
    RATE_LIMIT_PROFILES.GENERAL
  );
}
