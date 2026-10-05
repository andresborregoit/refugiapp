import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class ApproveAdoptionDto {
  @ApiPropertyOptional({ format: 'date-time', description: 'Defaults to the server time.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  adoptedAt?: string;
}
