import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CareTaskStatus } from '../../domain/enums/care-task-status.enum';

export class CareTaskResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  description?: string | null;

  @ApiProperty({ enum: CareTaskStatus })
  status!: CareTaskStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  dueAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  createdByUserId?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}