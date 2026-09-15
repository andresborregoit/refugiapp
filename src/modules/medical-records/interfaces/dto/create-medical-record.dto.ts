import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { MedicalRecordType } from '../../domain/enums/medical-record-type.enum';

export class CreateMedicalRecordDto {
  @ApiProperty()
  @IsUUID()
  animalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  veterinarianId?: string;

  @ApiProperty({ enum: MedicalRecordType })
  @IsEnum(MedicalRecordType)
  recordType!: MedicalRecordType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @ApiProperty()
  @IsDateString()
  occurredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  attachmentMediaIds?: string[];
}
