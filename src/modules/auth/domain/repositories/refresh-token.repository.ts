import { RefreshToken } from '../entities/refresh-token.entity';

export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface CreateRefreshToken {
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RotateRefreshTokenInput {
  tokenHash: string;
  newTokenHash: string;
  newExpiresAt: Date;
  reuseGraceMs: number;
}

export type RefreshRotationResult =
  | { status: 'rotated'; userId: string; familyId: string }
  | { status: 'reuse_detected' }
  | { status: 'concurrent_reuse' }
  | { status: 'expired' }
  | { status: 'not_found' };

export interface RefreshTokenRepository {
  create(input: CreateRefreshToken): Promise<RefreshToken>;
  rotate(input: RotateRefreshTokenInput): Promise<RefreshRotationResult>;
}