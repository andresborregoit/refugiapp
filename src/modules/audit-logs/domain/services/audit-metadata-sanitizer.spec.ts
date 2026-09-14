import { sanitizeAuditMetadata } from './audit-metadata-sanitizer';

describe('sanitizeAuditMetadata', () => {
  it('keeps non sensitive values untouched', () => {
    const result = sanitizeAuditMetadata({ animalId: 'animal-id', amountCents: 1250 });

    expect(result).toEqual({ animalId: 'animal-id', amountCents: 1250 });
  });

  it('redacts top level secret keys', () => {
    const result = sanitizeAuditMetadata({
      email: 'user@refugiapp.local',
      password: 'super-secret',
      passwordHash: 'bcrypt-hash',
      token: 'jwt-token',
      accessToken: 'jwt-token',
    });

    expect(result).toEqual({
      email: 'user@refugiapp.local',
      password: '[REDACTED]',
      passwordHash: '[REDACTED]',
      token: '[REDACTED]',
      accessToken: '[REDACTED]',
    });
  });

  it('redacts nested secret keys', () => {
    const result = sanitizeAuditMetadata({
      user: { email: 'user@refugiapp.local', jwtSecret: 'secret' },
      items: [{ apiKey: 'key' }, { name: 'safe' }],
    });

    expect(result).toEqual({
      user: { email: 'user@refugiapp.local', jwtSecret: '[REDACTED]' },
      items: [{ apiKey: '[REDACTED]' }, { name: 'safe' }],
    });
  });

  it('never returns a raw secret string', () => {
    const serialized = JSON.stringify(
      sanitizeAuditMetadata({
        password: 'super-secret',
        nested: { authorization: 'Bearer token', cloudinaryApiSecret: 'abc' },
      }),
    );

    expect(serialized).not.toContain('super-secret');
    expect(serialized).not.toContain('Bearer token');
    expect(serialized).not.toContain('abc');
  });

  it('returns an empty object for null or undefined metadata', () => {
    expect(sanitizeAuditMetadata(null)).toEqual({});
    expect(sanitizeAuditMetadata(undefined)).toEqual({});
  });

  it('preserves Date values', () => {
    const occurredAt = new Date('2026-03-10T10:00:00.000Z');

    expect(sanitizeAuditMetadata({ occurredAt })).toEqual({ occurredAt });
  });
});