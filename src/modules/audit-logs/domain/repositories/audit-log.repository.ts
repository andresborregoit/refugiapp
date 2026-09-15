import { AuditAction } from '../enums/audit-action.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditLog } from '../entities/create-audit-log.entity';

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');

export interface AuditLogListQuery {
  page: number;
  limit: number;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  page: number;
  limit: number;
  total: number;
}

export interface AuditLogRepository {
  save(input: CreateAuditLog): Promise<AuditLog>;
  findById(id: string): Promise<AuditLog | null>;
  findMany(query: AuditLogListQuery): Promise<PaginatedAuditLogs>;
  purgeOlderThan(threshold: Date): Promise<number>;
}