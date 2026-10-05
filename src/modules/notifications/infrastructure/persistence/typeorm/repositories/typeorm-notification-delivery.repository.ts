import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationDelivery } from '../../../../domain/entities/notification-delivery.entity';
import { NotificationDeliveryStatus } from '../../../../domain/enums/notification-delivery-status.enum';
import {
  CreateDeliveryInput,
  DeliveryListQuery,
  NotificationDeliveryRepository,
  PaginatedDeliveries,
} from '../../../../domain/repositories/notification-delivery.repository';
import { NotificationDeliveryOrmEntity } from '../entities/notification-delivery.orm-entity';

@Injectable()
export class TypeOrmNotificationDeliveryRepository implements NotificationDeliveryRepository {
  constructor(
    @InjectRepository(NotificationDeliveryOrmEntity)
    private readonly repository: Repository<NotificationDeliveryOrmEntity>,
  ) {}

  async insertIfNotExists(
    input: CreateDeliveryInput,
  ): Promise<{ delivery: NotificationDelivery; inserted: boolean }> {
    const existing = await this.repository.findOne({ where: { dedupKey: input.dedupKey } });

    if (existing) {
      return { delivery: this.toDomain(existing), inserted: false };
    }

    try {
      const created = await this.repository.save(
        this.repository.create({
          dedupKey: input.dedupKey,
          userId: input.userId,
          careTaskId: input.careTaskId,
          kind: input.kind,
          dueAtSnapshot: input.dueAtSnapshot,
          status: NotificationDeliveryStatus.QUEUED,
          attemptCount: 0,
        }),
      );

      return { delivery: this.toDomain(created), inserted: true };
    } catch (error) {
      if (error instanceof Error && /duplicate key|unique constraint/i.test(error.message)) {
        const raced = await this.repository.findOneOrFail({ where: { dedupKey: input.dedupKey } });

        return { delivery: this.toDomain(raced), inserted: false };
      }

      throw error;
    }
  }

  async findMany(query: DeliveryListQuery): Promise<PaginatedDeliveries> {
    const qb = this.repository.createQueryBuilder('delivery').where('delivery.deletedAt IS NULL');

    if (query.careTaskId) {
      qb.andWhere('delivery.careTaskId = :careTaskId', { careTaskId: query.careTaskId });
    }

    if (query.status) {
      qb.andWhere('delivery.status = :status', { status: query.status });
    }

    qb.orderBy('delivery.createdAt', 'DESC').addOrderBy('delivery.id', 'DESC');

    const total = await qb.getCount();
    const entities = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async markSent(id: string, receiptId: string | null): Promise<void> {
    await this.repository.update(id, {
      status: NotificationDeliveryStatus.SENT,
      providerReceiptId: receiptId,
      attemptCount: () => '"attemptCount" + 1',
      lastErrorCode: null,
    });
  }

  async markFailed(id: string, errorCode: string): Promise<void> {
    await this.repository.update(id, {
      status: NotificationDeliveryStatus.FAILED,
      attemptCount: () => '"attemptCount" + 1',
      lastErrorCode: errorCode,
    });
  }

  async markSkipped(id: string): Promise<void> {
    await this.repository.update(id, { status: NotificationDeliveryStatus.SKIPPED });
  }

  private toDomain(entity: NotificationDeliveryOrmEntity): NotificationDelivery {
    return new NotificationDelivery(
      entity.id,
      entity.dedupKey,
      entity.userId,
      entity.careTaskId,
      entity.kind,
      entity.dueAtSnapshot ?? null,
      entity.status,
      entity.providerReceiptId ?? null,
      entity.attemptCount,
      entity.lastErrorCode ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
