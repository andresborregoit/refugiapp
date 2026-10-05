import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalRecordChangeType } from '../../domain/enums/medical-record-change-type.enum';

export class ChangeActorDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class MedicalRecordChangeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  medicalRecordId!: string;

  @ApiPropertyOptional({ nullable: true, format: 'uuid' })
  changedByUserId?: string | null;

  @ApiProperty({ enum: MedicalRecordChangeType })
  changeType!: MedicalRecordChangeType;

  @ApiProperty({ type: String, isArray: true, description: 'Names of the fields that changed, derived from previousValues.' })
  changedFields!: string[];

  @ApiProperty({
    type: Object,
    description:
      'Previous values of the changed fields. For update, only the fields that changed. For soft_delete, a snapshot of all clinical fields. For restore, the deletedAt that was cleared.',
  })
  previousValues!: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  changedAt!: Date;

  @ApiPropertyOptional({
    type: ChangeActorDto,
    nullable: true,
    description:
      'Human-readable actor of the change. Null for system events or when the actor user was deleted. Email is intentionally omitted to protect colleague contact data.',
  })
  changedBy?: ChangeActorDto | null;
}