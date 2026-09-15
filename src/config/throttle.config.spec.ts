import { throttleConfig } from './throttle.config';

describe('throttle config', () => {
  const managedKeys = [
    'THROTTLE_GENERAL_TTL_MS',
    'THROTTLE_GENERAL_LIMIT',
    'THROTTLE_LOGIN_TTL_MS',
    'THROTTLE_LOGIN_LIMIT',
    'THROTTLE_ERROR_MESSAGE',
  ];
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of managedKeys) {
      original[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of managedKeys) {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    }
  });

  it('applies safe defaults', () => {
    expect(throttleConfig()).toEqual({
      generalTtlMs: 60000,
      generalLimit: 100,
      loginTtlMs: 60000,
      loginLimit: 5,
      errorMessage: 'Too many requests. Please try again later.',
    });
  });

  it('keeps the login limit stricter than the general limit by default', () => {
    const config = throttleConfig();

    expect(config.loginLimit).toBeLessThan(config.generalLimit);
  });

  it('reads overrides from the environment', () => {
    process.env.THROTTLE_GENERAL_TTL_MS = '30000';
    process.env.THROTTLE_GENERAL_LIMIT = '250';
    process.env.THROTTLE_LOGIN_TTL_MS = '15000';
    process.env.THROTTLE_LOGIN_LIMIT = '3';
    process.env.THROTTLE_ERROR_MESSAGE = 'Slow down.';

    expect(throttleConfig()).toEqual({
      generalTtlMs: 30000,
      generalLimit: 250,
      loginTtlMs: 15000,
      loginLimit: 3,
      errorMessage: 'Slow down.',
    });
  });
});