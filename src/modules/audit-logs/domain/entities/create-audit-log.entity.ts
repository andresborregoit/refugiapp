import { AuditAction } from '../enums/audit-action.enum';
import { AuditResourceType } from '../enums/audit-resource-type.enum';

export class CreateAuditLog {
  constructor(
    public readonly actorUserId: string | null,
    public readonly action: AuditAction,
    public readonly resourceType: AuditResourceType,
    public readonly resourceId: string | null,
    public readonly metadata: Record<string, unknown> = {},
    public readonly occurredAt: Date = new Date(),
  ) {}
}