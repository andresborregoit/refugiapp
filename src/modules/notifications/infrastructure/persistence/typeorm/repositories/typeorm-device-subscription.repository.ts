import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeviceSubscription } from '../../../../domain/entities/device-subscription.entity';
import {
  DeviceSubscriptionRepository,
  DeviceToken,
  RegisterDeviceInput,
} from '../../../../domain/repositories/device-subscription.repository';
import { DeviceSubscriptionOrmEntity } from '../entities/device-subscription.orm-entity';

@Injectable()
export class TypeOrmDeviceSubscriptionRepository implements DeviceSubscriptionRepository {
  constructor(
    @InjectRepository(DeviceSubscriptionOrmEntity)
    private readonly repository: Repository<DeviceSubscriptionOrmEntity>,
  ) {}

  async findById(id: string): Promise<DeviceSubscription | null> {
    const entity = await this.repository.findOne({ where: { id, deletedAt: IsNull() } });

    return entity ? this.toDomain(entity) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<DeviceSubscription | null> {
    const entity = await this.repository.findOne({ where: { tokenHash, deletedAt: IsNull() } });

    return entity ? this.toDomain(entity) : null;
  }

  async findActiveByUserId(userId: string): Promise<DeviceSubscription[]> {
    const entities = await this.repository.find({
      where: { userId, isActive: true, deletedAt: IsNull() },
      order: { lastSeenAt: 'DESC', id: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findActiveTokensByUserId(userId: string): Promise<DeviceToken[]> {
    const entities = await this.repository.find({
      where: { userId, isActive: true, deletedAt: IsNull() },
      order: { lastSeenAt: 'DESC', id: 'DESC' },
    });

    return entities.map((entity) => ({
      subscriptionId: entity.id,
      tokenHash: entity.tokenHash,
      expoPushToken: entity.expoPushToken,
      timezone: entity.timezone,
    }));
  }

  async upsert(input: RegisterDeviceInput): Promise<DeviceSubscription> {
    return this.repository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(DeviceSubscriptionOrmEntity);
      const existing = await repo.findOne({
        where: { tokenHash: input.tokenHash, deletedAt: IsNull() },
      });

      if (existing) {
        existing.userId = input.userId;
        existing.expoPushToken = input.expoPushToken;
        existing.tokenSuffix = input.tokenSuffix;
        existing.platform = input.platform;
        existing.timezone = input.timezone;
        existing.appVersion = input.appVersion ?? null;
        existing.isActive = true;
        existing.lastSeenAt = new Date();
        existing.deletedAt = null;

        return this.toDomain(await repo.save(existing));
      }

      const created = await repo.save(
        repo.create({
          userId: input.userId,
          expoPushToken: input.expoPushToken,
          tokenHash: input.tokenHash,
          tokenSuffix: input.tokenSuffix,
          platform: input.platform,
          timezone: input.timezone,
          appVersion: input.appVersion ?? null,
          isActive: true,
          lastSeenAt: new Date(),
        }),
      );

      return this.toDomain(created);
    });
  }

  async deactivate(id: string, userId: string): Promise<DeviceSubscription | null> {
    const entity = await this.repository.findOne({ where: { id, userId, deletedAt: IsNull() } });

    if (!entity) {
      return null;
    }

    entity.isActive = false;
    entity.deletedAt = new Date();

    return this.toDomain(await this.repository.save(entity));
  }

  async deactivateByTokenHash(tokenHash: string): Promise<number> {
    const result = await this.repository.update(
      { tokenHash, isActive: true, deletedAt: IsNull() },
      { isActive: false },
    );

    return result.affected ?? 0;
  }

  private toDomain(entity: DeviceSubscriptionOrmEntity): DeviceSubscription {
    return new DeviceSubscription(
      entity.id,
      entity.userId,
      entity.tokenHash,
      entity.tokenSuffix,
      entity.platform,
      entity.timezone,
      entity.appVersion ?? null,
      entity.isActive,
      entity.lastSeenAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
