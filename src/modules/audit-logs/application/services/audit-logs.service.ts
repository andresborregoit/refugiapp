import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AUDIT_LOG_RETENTION_DAYS } from '../../domain/constants/audit-log-retention';
import { AuditLog } from '../../domain/entities/audit-log.entity';
import { CreateAuditLog } from '../../domain/entities/create-audit-log.entity';
import { RecordAuditLogInput } from '../../domain/entities/record-audit-log.entity';
import {
  AUDIT_LOG_REPOSITORY,
  AuditLogRepository,
  PaginatedAuditLogs,
} from '../../domain/repositories/audit-log.repository';
import { sanitizeAuditMetadata } from '../../domain/services/audit-metadata-sanitizer';
import { ListAuditLogsQueryDto } from '../../interfaces/dto/list-audit-logs.query.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async record(input: RecordAuditLogInput): Promise<AuditLog> {
    const metadata = sanitizeAuditMetadata(input.metadata);

    const entry = new CreateAuditLog(
      input.actorUserId ?? null,
      input.action,
      input.resourceType,
      input.resourceId ?? null,
      metadata,
      input.occurredAt ?? new Date(),
    );

    return this.auditLogRepository.save(entry);
  }

  findById(id: string) {
    return this.auditLogRepository.findById(id);
  }

  async list(query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogs> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'from must be less than or equal to to.',
      });
    }

    return this.auditLogRepository.findMany({
      page: query.page,
      limit: query.limit,
      action: query.action,
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      actorUserId: query.actorUserId,
      from,
      to,
    });
  }

  async purgeExpired(now: Date = new Date()): Promise<number> {
    const threshold = new Date(now.getTime() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    return this.auditLogRepository.purgeOlderThan(threshold);
  }
}