import { Repository } from 'typeorm';
import { RefreshTokenOrmEntity } from '../entities/refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './typeorm-refresh-token.repository';

describe('TypeOrmRefreshTokenRepository', () => {
  const now = Date.now();
  const expiresAt = () => new Date(now + 86_400_000);
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let refreshTokenRepository: TypeOrmRefreshTokenRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      create: jest
        .fn()
        .mockImplementation((first: unknown, second?: unknown) => {
          const isEntityClass =
            typeof first === 'function' && /^\s*class\s/.test(String(first));
          const target = isEntityClass ? (first as new () => object) : RefreshTokenOrmEntity;
          const data = isEntityClass ? (second as object) : (first as object);

          return Object.assign(new target(), data);
        }),
      save: jest.fn().mockImplementation(async (entity: { id?: string }) => {
        if (!entity.id) {
          entity.id = 'generated-token-id';
        }

        return entity;
      }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn().mockImplementation(async (callback: (manager: unknown) => unknown) =>
          callback(repository),
        ),
      },
    };
    refreshTokenRepository = new TypeOrmRefreshTokenRepository(
      repository as unknown as Repository<RefreshTokenOrmEntity>,
    );
  });

  describe('create', () => {
    it('persists a refresh token with a null revocation state', async () => {
      const input = {
        userId: 'user-id',
        familyId: 'family-id',
        tokenHash: 'a'.repeat(64),
        expiresAt: expiresAt(),
      };

      const result = await refreshTokenRepository.create(input);

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        familyId: 'family-id',
        tokenHash: 'a'.repeat(64),
        expiresAt: expiresAt(),
        revokedAt: null,
        replacedById: null,
      });
      expect(result).toMatchObject({
        id: 'generated-token-id',
        userId: 'user-id',
        familyId: 'family-id',
      });
    });
  });

  describe('rotate', () => {
    function buildEntity(overrides: Partial<RefreshTokenOrmEntity> = {}): RefreshTokenOrmEntity {
      return Object.assign(new RefreshTokenOrmEntity(), {
        id: 'token-id',
        userId: 'user-id',
        familyId: 'family-id',
        tokenHash: 'a'.repeat(64),
        expiresAt: expiresAt(),
        revokedAt: null,
        replacedById: null,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        ...overrides,
      });
    }

    it('rotates a valid token into a successor within the same family', async () => {
      const entity = buildEntity();
      repository.findOne.mockResolvedValue(entity);

      const result = await refreshTokenRepository.rotate({
        tokenHash: 'a'.repeat(64),
        newTokenHash: 'b'.repeat(64),
        newExpiresAt: expiresAt(),
        reuseGraceMs: 30_000,
      });

      expect(repository.findOne).toHaveBeenCalledWith(RefreshTokenOrmEntity, {
        where: { tokenHash: 'a'.repeat(64) },
        lock: { mode: 'pessimistic_write' },
      });
      expect(repository.update).toHaveBeenCalledWith(
        RefreshTokenOrmEntity,
        { id: 'token-id' },
        { revokedAt: expect.any(Date) },
      );
      expect(repository.create).toHaveBeenCalledWith(RefreshTokenOrmEntity, {
        userId: 'user-id',
        familyId: 'family-id',
        tokenHash: 'b'.repeat(64),
        expiresAt: expect.any(Date),
        revokedAt: null,
        replacedById: 'token-id',
      });
      expect(result).toEqual({ status: 'rotated', userId: 'user-id', familyId: 'family-id' });
    });

    it('rejects a revoked token reused within the grace window without revoking the family', async () => {
      repository.findOne.mockResolvedValue(buildEntity({ revokedAt: new Date(now - 1000) }));

      const result = await refreshTokenRepository.rotate({
        tokenHash: 'a'.repeat(64),
        newTokenHash: 'b'.repeat(64),
        newExpiresAt: expiresAt(),
        reuseGraceMs: 30_000,
      });

      expect(result).toEqual({ status: 'concurrent_reuse' });
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('revokes the whole family when a revoked token is reused outside the grace window', async () => {
      repository.findOne.mockResolvedValue(
        buildEntity({ revokedAt: new Date(now - 60_000) }),
      );

      const result = await refreshTokenRepository.rotate({
        tokenHash: 'a'.repeat(64),
        newTokenHash: 'b'.repeat(64),
        newExpiresAt: expiresAt(),
        reuseGraceMs: 30_000,
      });

      expect(result).toEqual({ status: 'reuse_detected' });
      expect(repository.update).toHaveBeenCalledWith(
        RefreshTokenOrmEntity,
        { familyId: 'family-id', revokedAt: expect.any(Object) },
        { revokedAt: expect.any(Date) },
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('revokes and rejects an expired token', async () => {
      repository.findOne.mockResolvedValue(
        buildEntity({ expiresAt: new Date(now - 1000) }),
      );

      const result = await refreshTokenRepository.rotate({
        tokenHash: 'a'.repeat(64),
        newTokenHash: 'b'.repeat(64),
        newExpiresAt: expiresAt(),
        reuseGraceMs: 30_000,
      });

      expect(result).toEqual({ status: 'expired' });
      expect(repository.update).toHaveBeenCalledWith(
        RefreshTokenOrmEntity,
        { id: 'token-id' },
        { revokedAt: expect.any(Date) },
      );
    });

    it('returns not_found when the token does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await refreshTokenRepository.rotate({
        tokenHash: 'a'.repeat(64),
        newTokenHash: 'b'.repeat(64),
        newExpiresAt: expiresAt(),
        reuseGraceMs: 30_000,
      });

      expect(result).toEqual({ status: 'not_found' });
    });
  });
});