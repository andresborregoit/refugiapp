import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../../users/domain/entities/user.entity';
import { UserCredentials } from '../../../users/domain/entities/user-credentials.entity';
import { hashPassword } from '../../../../common/security/password-hasher';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtSecret = 'test-secret-with-at-least-thirty-two-characters';
  const configValues: Record<string, string | number> = {
    'jwt.secret': jwtSecret,
    'jwt.expiresIn': '1h',
    'jwt.issuer': 'refugiapp-api-test',
    'jwt.audience': 'refugiapp-mobile-test',
    'jwt.refreshTokenTtlMs': 7 * 24 * 60 * 60 * 1000,
    'jwt.refreshReuseGraceMs': 30_000,
  };
  const configService = {
    get: jest.fn((key: string, fallback?: string | number) => configValues[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      const value = configValues[key];
      if (!value) {
        throw new Error(`${key} is required.`);
      }
      return value;
    }),
  };
  const usersService = {
    findCredentialsByEmail: jest.fn(),
    findById: jest.fn(),
  };
  const auditLogsService = {
    record: jest.fn(),
  };
  const refreshTokenRepository = {
    create: jest.fn(),
    rotate: jest.fn(),
  };
  let service: AuthService;
  let activeUser: UserCredentials;

  beforeAll(async () => {
    activeUser = new UserCredentials(
      'user-id',
      'admin@refugiapp.local',
      await hashPassword('correct-password'),
      [UserRole.ADMIN],
      true,
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      new JwtService({
        secret: jwtSecret,
        signOptions: { expiresIn: '1h', issuer: 'refugiapp-api-test', audience: 'refugiapp-mobile-test' },
      }),
      configService as unknown as ConfigService,
      usersService as any,
      auditLogsService as any,
      refreshTokenRepository as any,
    );
  });

  describe('login', () => {
    it('issues an access token and a refresh token', async () => {
      usersService.findCredentialsByEmail.mockResolvedValue(activeUser);
      refreshTokenRepository.create.mockResolvedValue({});

      const result = await service.login({
        email: 'admin@refugiapp.local',
        password: 'correct-password',
      });

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          familyId: expect.any(String),
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe(result.accessToken);
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login_success' }),
      );
    });

    it('never stores the raw refresh token', async () => {
      usersService.findCredentialsByEmail.mockResolvedValue(activeUser);
      refreshTokenRepository.create.mockResolvedValue({});

      const result = await service.login({
        email: 'admin@refugiapp.local',
        password: 'correct-password',
      });

      const stored = refreshTokenRepository.create.mock.calls[0]![0] as {
        tokenHash: string;
      };
      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.tokenHash).not.toBe(result.refreshToken);
    });
  });

  describe('refresh', () => {
    const user = new User('user-id', 'admin@refugiapp.local', 'A', 'B', [UserRole.ADMIN], true);

    it('rotates the token and issues a fresh pair with the same user identity', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({
        status: 'rotated',
        userId: 'user-id',
        familyId: 'family-id',
      });
      usersService.findById.mockResolvedValue(user);

      const result = await service.refresh('some-refresh-token');

      expect(refreshTokenRepository.rotate).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        newTokenHash: expect.any(String),
        newExpiresAt: expect.any(Date),
        reuseGraceMs: 30_000,
      });
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.refreshToken).not.toBe('some-refresh-token');
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.refresh_success' }),
      );
    });

    it('rejects unknown tokens with 401 INVALID_REFRESH_TOKEN', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({ status: 'not_found' });

      await expect(service.refresh('unknown-token')).rejects.toMatchObject({
        status: 401,
        response: expect.objectContaining({ code: 'INVALID_REFRESH_TOKEN' }),
      });
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.refresh_failure' }),
      );
    });

    it('rejects expired tokens with 401 REFRESH_TOKEN_EXPIRED', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({ status: 'expired' });

      await expect(service.refresh('expired-token')).rejects.toMatchObject({
        status: 401,
        response: expect.objectContaining({ code: 'REFRESH_TOKEN_EXPIRED' }),
      });
    });

    it('rejects reused tokens outside the grace window with 401 REFRESH_REUSE_DETECTED', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({ status: 'reuse_detected' });

      await expect(service.refresh('reused-token')).rejects.toMatchObject({
        status: 401,
        response: expect.objectContaining({ code: 'REFRESH_REUSE_DETECTED' }),
      });
    });

    it('rejects a concurrent reuse with 401 REFRESH_TOKEN_CONCURRENT_USE', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({ status: 'concurrent_reuse' });

      await expect(service.refresh('concurrent-token')).rejects.toMatchObject({
        status: 401,
        response: expect.objectContaining({ code: 'REFRESH_TOKEN_CONCURRENT_USE' }),
      });
    });

    it('rejects rotation for a missing or deactivated user', async () => {
      refreshTokenRepository.rotate.mockResolvedValue({
        status: 'rotated',
        userId: 'user-id',
        familyId: 'family-id',
      });
      usersService.findById.mockResolvedValue(null);

      await expect(service.refresh('some-refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.refresh_failure' }),
      );
    });
  });
});