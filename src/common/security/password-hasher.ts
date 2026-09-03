import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 12;
export const BCRYPT_SALT_ROUNDS = 12;

export class PasswordPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);

  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new PasswordPolicyError(
      `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }
}
