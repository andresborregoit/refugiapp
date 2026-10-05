import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdoptionApplicationStatus } from '../../domain/enums/adoption-application-status.enum';

export class AdoptionApplicationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  animalId!: string;

  @ApiProperty({ format: 'uuid' })
  adopterId!: string;

  @ApiProperty({ enum: AdoptionApplicationStatus })
  status!: AdoptionApplicationStatus;

  @ApiProperty({ format: 'date-time' })
  submittedAt!: Date;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  decidedAt!: Date | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  decidedByUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
