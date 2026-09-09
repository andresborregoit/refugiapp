import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalRecordType } from '../../domain/enums/medical-record-type.enum';

export class MedicalRecordResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiPropertyOptional({ nullable: true })
  veterinarianId?: string | null;

  @ApiProperty({ enum: MedicalRecordType })
  recordType!: MedicalRecordType;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  diagnosis?: string | null;

  @ApiPropertyOptional({ nullable: true })
  treatment?: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
