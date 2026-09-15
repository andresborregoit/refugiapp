import {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_MIN_LENGTH,
  PasswordPolicyError,
  hashPassword,
  verifyPassword,
} from './password-hasher';

describe('password hasher', () => {
  const password = 'correct horse battery staple';

  it('hashes passwords with bcrypt and never returns the plain password', async () => {
    const passwordHash = await hashPassword(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$2[aby]\$/);
    expect(passwordHash).toContain(`$${BCRYPT_SALT_ROUNDS}$`);
  });

  it('returns true for the correct password', async () => {
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword('wrong password value', passwordHash)).resolves.toBe(false);
  });

  it('returns false for an invalid hash', async () => {
    await expect(verifyPassword(password, 'invalid-hash')).resolves.toBe(false);
  });

  it('rejects passwords shorter than the configured policy', async () => {
    await expect(hashPassword('short')).rejects.toThrow(PasswordPolicyError);
    expect(PASSWORD_MIN_LENGTH).toBe(12);
  });
});
