import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';

export class ChangeAnimalStatusDto {
  @ApiProperty({ enum: AnimalStatus })
  @IsEnum(AnimalStatus)
  status!: AnimalStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
