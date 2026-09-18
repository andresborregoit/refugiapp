import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCareTaskDto {
  @ApiPropertyOptional({
    description: 'Task title (3..160 characters). Only sent when it must change.',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Task description. Omit to keep the current value; pass null to clear it. Empty or whitespace-only strings are stored as null.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Due date. Omit to keep the current value; pass null to clear it.',
  })
  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}