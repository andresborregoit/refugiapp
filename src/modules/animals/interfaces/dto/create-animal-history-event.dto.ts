import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { AnimalHistoryEventType } from '../../domain/enums/animal-history-event-type.enum';
import { MANUAL_ANIMAL_HISTORY_EVENT_TYPES } from '../../domain/enums/animal-history-event-type.enum';

export class CreateAnimalHistoryEventDto {
  @ApiProperty({ enum: MANUAL_ANIMAL_HISTORY_EVENT_TYPES })
  @IsIn([...MANUAL_ANIMAL_HISTORY_EVENT_TYPES])
  eventType!: AnimalHistoryEventType;

  @ApiProperty({ example: 'Moved to foster home.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
