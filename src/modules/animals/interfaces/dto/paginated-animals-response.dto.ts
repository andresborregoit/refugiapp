import { ApiProperty } from '@nestjs/swagger';
import { AnimalResponseDto } from './animal-response.dto';

export class PaginatedAnimalsResponseDto {
  @ApiProperty({ type: AnimalResponseDto, isArray: true })
  items!: AnimalResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
