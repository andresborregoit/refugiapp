import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnimalHistoryEventType } from '../../domain/enums/animal-history-event-type.enum';

export class AnimalHistoryEventResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiProperty({ enum: AnimalHistoryEventType })
  eventType!: AnimalHistoryEventType;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  occurredAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  createdByUserId?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}
