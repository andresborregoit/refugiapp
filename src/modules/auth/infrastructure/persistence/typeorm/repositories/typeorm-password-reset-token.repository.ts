import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  ConsumePasswordResetTokenResult,
  CreatePasswordResetToken,
  PasswordResetTokenRepository,
} from '../../../../domain/repositories/password-reset-token.repository';
import { RefreshTokenOrmEntity } from '../../../persistence/typeorm/entities/refresh-token.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { PasswordResetTokenOrmEntity } from '../entities/password-reset-token.orm-entity';

@Injectable()
export class TypeOrmPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetTokenOrmEntity)
    private readonly repository: Repository<PasswordResetTokenOrmEntity>,
  ) {}

  async create(input: CreatePasswordResetToken): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.update(
        PasswordResetTokenOrmEntity,
        { userId: input.userId, usedAt: IsNull() },
        { usedAt: new Date() },
      );
      await manager.save(
        manager.create(PasswordResetTokenOrmEntity, {
          ...input,
          usedAt: null,
        }),
      );
    });
  }

  async consumeAndUpdatePassword(
    tokenHash: string,
    passwordHash: string,
  ): Promise<ConsumePasswordResetTokenResult> {
    return this.repository.manager.transaction(async (manager) => {
      const token = await manager.findOne(PasswordResetTokenOrmEntity, {
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });

      if (!token) {
        return { status: 'not_found' };
      }

      if (token.usedAt) {
        return { status: 'already_used' };
      }

      if (token.expiresAt.getTime() <= Date.now()) {
        await manager.update(PasswordResetTokenOrmEntity, { id: token.id }, { usedAt: new Date() });
        return { status: 'expired' };
      }

      const user = await manager.findOne(UserOrmEntity, {
        where: { id: token.userId, isActive: true },
      });

      if (!user) {
        await manager.update(PasswordResetTokenOrmEntity, { id: token.id }, { usedAt: new Date() });
        return { status: 'not_found' };
      }

      const now = new Date();
      await manager.update(UserOrmEntity, { id: user.id }, { passwordHash });
      await manager.update(PasswordResetTokenOrmEntity, { id: token.id }, { usedAt: now });
      await manager.update(
        RefreshTokenOrmEntity,
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: now },
      );

      return { status: 'consumed', userId: user.id, email: user.email };
    });
  }
}
