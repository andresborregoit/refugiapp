import { ApiProperty } from '@nestjs/swagger';
import { AdoptionApplicationResponseDto } from './adoption-application-response.dto';

export class PaginatedAdoptionApplicationsResponseDto {
  @ApiProperty({ type: [AdoptionApplicationResponseDto] })
  items!: AdoptionApplicationResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
