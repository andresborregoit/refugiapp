import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThan,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { AuditLog } from '../../../../domain/entities/audit-log.entity';
import { CreateAuditLog } from '../../../../domain/entities/create-audit-log.entity';
import {
  AuditLogListQuery,
  AuditLogRepository,
  PaginatedAuditLogs,
} from '../../../../domain/repositories/audit-log.repository';
import { AuditLogOrmEntity } from '../entities/audit-log.orm-entity';

@Injectable()
export class TypeOrmAuditLogRepository implements AuditLogRepository {
  constructor(
    @InjectRepository(AuditLogOrmEntity)
    private readonly repository: Repository<AuditLogOrmEntity>,
  ) {}

  async save(input: CreateAuditLog): Promise<AuditLog> {
    const entity = await this.repository.save(
      this.repository.create({
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        occurredAt: input.occurredAt,
        metadata: input.metadata,
      }),
    );

    return this.toDomain(entity);
  }

  async findById(id: string): Promise<AuditLog | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: AuditLogListQuery): Promise<PaginatedAuditLogs> {
    const where: FindOptionsWhere<AuditLogOrmEntity> = {};

    if (query.action) {
      where.action = query.action;
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }

    if (query.from && query.to) {
      where.occurredAt = Between(query.from, query.to);
    } else if (query.from) {
      where.occurredAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.occurredAt = LessThanOrEqual(query.to);
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { occurredAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async purgeOlderThan(threshold: Date): Promise<number> {
    const result = await this.repository.delete({ occurredAt: LessThan(threshold) });

    return result.affected ?? 0;
  }

  private toDomain(entity: AuditLogOrmEntity): AuditLog {
    return new AuditLog(
      entity.id,
      entity.actorUserId ?? null,
      entity.action,
      entity.resourceType,
      entity.resourceId ?? null,
      entity.occurredAt,
      entity.metadata ?? {},
      entity.createdAt,
      entity.updatedAt,
    );
  }
}