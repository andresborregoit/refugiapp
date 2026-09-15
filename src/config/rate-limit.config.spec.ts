import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RATE_LIMIT_PROFILE_METADATA,
  RATE_LIMIT_PROFILES,
} from '../common/decorators/rate-limit-profile.decorator';
import { createRateLimitOptions } from './rate-limit.config';

describe('createRateLimitOptions', () => {
  const values: Record<string, number> = {
    'security.rateLimit.general.limit': 80,
    'security.rateLimit.general.ttlMs': 30000,
    'security.rateLimit.login.limit': 4,
    'security.rateLimit.login.ttlMs': 45000,
  };
  const configService = {
    get: jest.fn((key: string, fallback: number) => values[key] ?? fallback),
  } as unknown as ConfigService;

  it('builds independent general and login limits from configuration', () => {
    const options = createRateLimitOptions(configService);

    expect(Array.isArray(options)).toBe(false);
    if (Array.isArray(options)) {
      throw new Error('Expected object throttler options.');
    }

    expect(options.throttlers).toEqual([
      expect.objectContaining({ name: 'general', limit: 80, ttl: 30000 }),
      expect.objectContaining({ name: 'login', limit: 4, ttl: 45000 }),
    ]);
  });

  it('selects the login profile only for decorated handlers', () => {
    const options = createRateLimitOptions(configService);
    if (Array.isArray(options)) {
      throw new Error('Expected object throttler options.');
    }

    class TestController {
      general(): void {}
      login(): void {}
    }

    Reflect.defineMetadata(
      RATE_LIMIT_PROFILE_METADATA,
      RATE_LIMIT_PROFILES.LOGIN,
      TestController.prototype.login,
    );

    const generalContext = createContext(TestController, TestController.prototype.general);
    const loginContext = createContext(TestController, TestController.prototype.login);
    const [generalThrottler, loginThrottler] = options.throttlers;

    expect(generalThrottler.skipIf?.(generalContext)).toBe(false);
    expect(loginThrottler.skipIf?.(generalContext)).toBe(true);
    expect(generalThrottler.skipIf?.(loginContext)).toBe(true);
    expect(loginThrottler.skipIf?.(loginContext)).toBe(false);
  });
});

function createContext(controller: new () => unknown, handler: () => void): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () => handler,
  } as unknown as ExecutionContext;
}
