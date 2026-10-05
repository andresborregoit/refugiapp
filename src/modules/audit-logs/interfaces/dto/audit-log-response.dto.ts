import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../domain/enums/audit-resource-type.enum';

export class AuditActorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ format: 'email' })
  email!: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  actorUserId?: string | null;

  @ApiProperty({ enum: AuditAction })
  action!: AuditAction;

  @ApiProperty({ enum: AuditResourceType })
  resourceType!: AuditResourceType;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  resourceId?: string | null;

  @ApiProperty()
  metadata!: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiPropertyOptional({
    type: AuditActorDto,
    nullable: true,
    description:
      'Human-readable actor of the event. Null for system events or when the actor user was deleted.',
  })
  actor?: AuditActorDto | null;
}