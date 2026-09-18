import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../../../../domain/entities/refresh-token.entity';
import {
  CreateRefreshToken,
  RefreshRotationResult,
  RefreshTokenRepository,
  RotateRefreshTokenInput,
} from '../../../../domain/repositories/refresh-token.repository';
import { RefreshTokenOrmEntity } from '../entities/refresh-token.orm-entity';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repository: Repository<RefreshTokenOrmEntity>,
  ) {}

  async create(input: CreateRefreshToken): Promise<RefreshToken> {
    const entity = await this.repository.save(
      this.repository.create({
        userId: input.userId,
        familyId: input.familyId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        revokedAt: null,
        replacedById: null,
      }),
    );

    return this.toDomain(entity);
  }

  /**
   * Rota un refresh token de forma atomica con `SELECT ... FOR UPDATE` para
   * serializar requests concurrentes sobre el mismo hash.
   *
   * - `rotated`: token valido; se revoca el actual y se emite un sucesor en la misma familia.
   * - `concurrent_reuse`: se presenta un token revocado dentro de la ventana de gracia
   *   (`reuseGraceMs`). Se interpreta como una renovacion simultanea legitima: se rechaza
   *   sin revocar la familia, de modo que el token recien emitido sigue siendo el unico valido.
   * - `reuse_detected`: se presenta un token revocado fuera de la ventana de gracia; se
   *   interpreta como reuso real y se revoca toda la familia.
   * - `expired`: token vencido; se revoca y se rechaza.
   * - `not_found`: no existe el token.
   */
  async rotate(input: RotateRefreshTokenInput): Promise<RefreshRotationResult> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(RefreshTokenOrmEntity, {
        where: { tokenHash: input.tokenHash },
        lock: { mode: 'pessimistic_write' },
      });

      if (!entity) {
        return { status: 'not_found' };
      }

      if (entity.revokedAt) {
        const withinGrace = Date.now() - entity.revokedAt.getTime() <= input.reuseGraceMs;

        if (withinGrace) {
          return { status: 'concurrent_reuse' };
        }

        await this.revokeFamily(manager, entity.familyId);
        return { status: 'reuse_detected' };
      }

      if (entity.expiresAt.getTime() <= Date.now()) {
        await manager.update(RefreshTokenOrmEntity, { id: entity.id }, { revokedAt: new Date() });
        return { status: 'expired' };
      }

      const now = new Date();
      await manager.update(RefreshTokenOrmEntity, { id: entity.id }, { revokedAt: now });

      await manager.save(
        manager.create(RefreshTokenOrmEntity, {
          userId: entity.userId,
          familyId: entity.familyId,
          tokenHash: input.newTokenHash,
          expiresAt: input.newExpiresAt,
          revokedAt: null,
          replacedById: entity.id,
        }),
      );

      return { status: 'rotated', userId: entity.userId, familyId: entity.familyId };
    });
  }

  private async revokeFamily(manager: EntityManager, familyId: string): Promise<void> {
    await manager.update(
      RefreshTokenOrmEntity,
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private toDomain(entity: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken(
      entity.id,
      entity.userId,
      entity.familyId,
      entity.tokenHash,
      entity.expiresAt,
      entity.revokedAt ?? null,
      entity.replacedById ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}