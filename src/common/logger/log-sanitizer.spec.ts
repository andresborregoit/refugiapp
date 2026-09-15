import { sanitizeLogValue } from './log-sanitizer';

describe('sanitizeLogValue', () => {
  it('redacts sensitive keys recursively in objects', () => {
    const sanitized = sanitizeLogValue({
      email: 'admin@refugiapp.local',
      password: 'super-secret',
      nested: {
        token: 'jwt-token',
        authorization: 'Bearer abc',
      },
    });

    expect(sanitized).toEqual({
      email: 'admin@refugiapp.local',
      password: '[REDACTED]',
      nested: {
        token: '[REDACTED]',
        authorization: '[REDACTED]',
      },
    });
  });

  it('redacts sensitive values inside string messages', () => {
    const sanitized = sanitizeLogValue(
      'Connection failed with password=hunter2 and Bearer eyJhbGciOiJIUzI1NiJ9.token',
    );

    expect(sanitized).toContain('password=[REDACTED]');
    expect(sanitized).toContain('Bearer [REDACTED]');
    expect(sanitized).not.toContain('hunter2');
    expect(sanitized).not.toContain('eyJhbGciOiJIUzI1NiJ9.token');
  });

  it('keeps arrays and primitives intact', () => {
    expect(sanitizeLogValue([1, 'two', { name: 'ok' }])).toEqual([1, 'two', { name: 'ok' }]);
    expect(sanitizeLogValue('plain message')).toBe('plain message');
    expect(sanitizeLogValue(42)).toBe(42);
  });
});