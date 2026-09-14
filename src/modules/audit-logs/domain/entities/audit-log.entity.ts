import { AuditAction } from '../enums/audit-action.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';

export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly actorUserId: string | null,
    public readonly action: AuditAction,
    public readonly resourceType: AuditResourceType,
    public readonly resourceId: string | null,
    public readonly occurredAt: Date,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}