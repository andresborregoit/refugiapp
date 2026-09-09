import { ApiProperty } from '@nestjs/swagger';
import { AnimalHistoryEventResponseDto } from './animal-history-event-response.dto';

export class PaginatedAnimalHistoryEventsResponseDto {
  @ApiProperty({ type: AnimalHistoryEventResponseDto, isArray: true })
  items!: AnimalHistoryEventResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}
