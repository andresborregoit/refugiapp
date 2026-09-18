import { ApiProperty } from '@nestjs/swagger';
import { CareTaskResponseDto } from './care-task-response.dto';

export class PaginatedCareTasksResponseDto {
  @ApiProperty({ type: CareTaskResponseDto, isArray: true })
  items!: CareTaskResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}