import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { verifyPassword } from '../../../../common/security/password-hasher';
import { UsersService } from '../../../users/application/services/users.service';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { JwtPayload } from '../../domain/interfaces/jwt-payload.interface';
import { REFRESH_TOKEN_REPOSITORY, RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository';
import { AuthResponseDto } from '../../interfaces/dto/auth-response.dto';
import { LoginDto } from '../../interfaces/dto/login.dto';
import { generateRefreshToken, hashRefreshToken } from '../../infrastructure/security/refresh-token-generator';

const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_REUSE_GRACE_MS = 30 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findCredentialsByEmail(email);

    if (!user?.isActive) {
      await this.auditLogsService.record({
        actorUserId: null,
        action: AuditAction.AUTH_LOGIN_FAILURE,
        resourceType: AuditResourceType.AUTH_SESSION,
        resourceId: null,
        metadata: {
          email,
          reason: 'user_missing_or_inactive',
        },
      });

      throw this.invalidCredentials();
    }

    const passwordMatches = await verifyPassword(dto.password, user.passwordHash);

    if (!passwordMatches) {
      await this.auditLogsService.record({
        actorUserId: user.id,
        action: AuditAction.AUTH_LOGIN_FAILURE,
        resourceType: AuditResourceType.AUTH_SESSION,
        resourceId: user.id,
        metadata: {
          email: user.email,
          reason: 'invalid_password',
        },
      });

      throw this.invalidCredentials();
    }

    const refreshToken = await this.issueRefreshToken(user.id);

    const response = this.issueAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: AuditAction.AUTH_LOGIN_SUCCESS,
      resourceType: AuditResourceType.AUTH_SESSION,
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
    });

    return { ...response, refreshToken };
  }

  async refresh(rawRefreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + this.refreshTokenTtlMs());

    const result = await this.refreshTokenRepository.rotate({
      tokenHash,
      newTokenHash,
      newExpiresAt,
      reuseGraceMs: this.reuseGraceMs(),
    });

    if (result.status !== 'rotated') {
      await this.auditLogsService.record({
        actorUserId: null,
        action: AuditAction.AUTH_REFRESH_FAILURE,
        resourceType: AuditResourceType.AUTH_SESSION,
        resourceId: null,
        metadata: {
          reason: this.refreshFailureReason(result.status),
        },
      });

      throw this.refreshUnauthorized(result.status);
    }

    const user = await this.usersService.findById(result.userId);

    if (!user?.isActive) {
      await this.auditLogsService.record({
        actorUserId: null,
        action: AuditAction.AUTH_REFRESH_FAILURE,
        resourceType: AuditResourceType.AUTH_SESSION,
        resourceId: null,
        metadata: {
          reason: 'user_missing_or_inactive',
        },
      });

      throw this.invalidRefreshToken();
    }

    const response = this.issueAccessToken({
      id: user.id,
      email: user.email,
      roles: user.roles,
    });

    await this.auditLogsService.record({
      actorUserId: user.id,
      action: AuditAction.AUTH_REFRESH_SUCCESS,
      resourceType: AuditResourceType.AUTH_SESSION,
      resourceId: user.id,
      metadata: {
        email: user.email,
      },
    });

    return { ...response, refreshToken: newRawRefreshToken };
  }

  issueAccessToken(user: AuthenticatedUser): Omit<AuthResponseDto, 'refreshToken'> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('jwt.expiresIn', '1d'),
    };
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = generateRefreshToken();

    await this.refreshTokenRepository.create({
      userId,
      familyId: randomUUID(),
      tokenHash: hashRefreshToken(rawToken),
      expiresAt: new Date(Date.now() + this.refreshTokenTtlMs()),
    });

    return rawToken;
  }

  private refreshTokenTtlMs(): number {
    return this.configService.get<number>('jwt.refreshTokenTtlMs', DEFAULT_REFRESH_TOKEN_TTL_MS);
  }

  private reuseGraceMs(): number {
    return this.configService.get<number>('jwt.refreshReuseGraceMs', DEFAULT_REUSE_GRACE_MS);
  }

  private refreshFailureReason(
    status: 'not_found' | 'expired' | 'reuse_detected' | 'concurrent_reuse',
  ): string {
    switch (status) {
      case 'expired':
        return 'refresh_token_expired';
      case 'reuse_detected':
        return 'refresh_token_reuse_detected';
      case 'concurrent_reuse':
        return 'refresh_token_concurrent_use';
      default:
        return 'refresh_token_invalid';
    }
  }

  private refreshUnauthorized(
    status: 'not_found' | 'expired' | 'reuse_detected' | 'concurrent_reuse',
  ): UnauthorizedException {
    if (status === 'reuse_detected') {
      return new UnauthorizedException({
        code: 'REFRESH_REUSE_DETECTED',
        message: 'Refresh token reuse detected; the session was revoked.',
      });
    }

    if (status === 'expired') {
      return new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'The refresh token has expired.',
      });
    }

    if (status === 'concurrent_reuse') {
      return new UnauthorizedException({
        code: 'REFRESH_TOKEN_CONCURRENT_USE',
        message: 'The refresh token was already used by a concurrent request.',
      });
    }

    return this.invalidRefreshToken();
  }

  private invalidRefreshToken(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'The refresh token is invalid.',
    });
  }

  private invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  }
}