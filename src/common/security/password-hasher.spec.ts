import { hashPassword, verifyPassword } from './password-hasher';

describe('password hasher', () => {
  const password = 'correct-password';

  it('returns true for the correct password', async () => {
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const passwordHash = await hashPassword(password);

    await expect(verifyPassword('incorrect-password', passwordHash)).resolves.toBe(false);
  });

  it('returns false for an invalid hash', async () => {
    await expect(verifyPassword(password, 'invalid-hash')).resolves.toBe(false);
  });
});
