export const PASSWORD_RESET_TOKEN_REPOSITORY = Symbol('PASSWORD_RESET_TOKEN_REPOSITORY');

export interface CreatePasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type ConsumePasswordResetTokenResult =
  | { status: 'consumed'; userId: string; email: string }
  | { status: 'expired' }
  | { status: 'already_used' }
  | { status: 'not_found' };

export interface PasswordResetTokenRepository {
  create(input: CreatePasswordResetToken): Promise<void>;
  consumeAndUpdatePassword(tokenHash: string, passwordHash: string): Promise<ConsumePasswordResetTokenResult>;
}
