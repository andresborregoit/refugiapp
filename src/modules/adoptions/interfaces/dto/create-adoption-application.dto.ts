import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class CreateAdoptionApplicationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  adopterId!: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'Defaults to the server time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  submittedAt?: string;
}
