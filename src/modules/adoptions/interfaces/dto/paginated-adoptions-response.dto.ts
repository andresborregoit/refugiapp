import { ApiProperty } from '@nestjs/swagger';
import { AdoptionResponseDto } from './adoption-response.dto';

export class PaginatedAdoptionsResponseDto {
  @ApiProperty({ type: [AdoptionResponseDto] })
  items!: AdoptionResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
