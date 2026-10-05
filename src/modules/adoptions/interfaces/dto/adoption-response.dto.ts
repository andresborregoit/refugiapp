import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdoptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  animalId!: string;

  @ApiProperty({ format: 'uuid' })
  adopterId!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ format: 'date-time' })
  adoptedAt!: Date;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  responsibleUserId!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
