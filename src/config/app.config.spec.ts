import { appConfig } from './app.config';

describe('app config', () => {
  const managedKeys = ['FRONTEND_ORIGINS', 'TRUST_PROXY'];
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

  it('parses an empty origin list by default', () => {
    expect(appConfig().corsOrigins).toEqual([]);
  });

  it('parses comma separated origins trimming whitespace', () => {
    process.env.FRONTEND_ORIGINS = 'https://app.example.com, https://admin.example.com ,';

    expect(appConfig().corsOrigins).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('defaults trust proxy to zero hops', () => {
    expect(appConfig().trustProxy).toBe(0);
  });

  it('reads the trust proxy hop count from the environment', () => {
    process.env.TRUST_PROXY = '1';

    expect(appConfig().trustProxy).toBe(1);
  });
});