import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { MedicalRecordType } from '../../domain/enums/medical-record-type.enum';

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ enum: MedicalRecordType, description: 'Record type. Only sent when it must change.' })
  @IsOptional()
  @IsEnum(MedicalRecordType)
  recordType?: MedicalRecordType;

  @ApiPropertyOptional({ description: 'Record title (3..160 characters). Only sent when it must change.' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Date of care. Omit to keep the current value.' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Veterinarian responsible for the record. Omit to keep the current value; pass null to unlink the veterinarian.',
  })
  @IsOptional()
  @IsUUID()
  veterinarianId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Clinical diagnosis. Omit to keep the current value; pass null to clear it. Empty or whitespace-only strings are stored as null.',
  })
  @IsOptional()
  @IsString()
  diagnosis?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Treatment. Omit to keep the current value; pass null to clear it. Empty or whitespace-only strings are stored as null.',
  })
  @IsOptional()
  @IsString()
  treatment?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Notes. Omit to keep the current value; pass null to clear it. Empty or whitespace-only strings are stored as null.',
  })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
