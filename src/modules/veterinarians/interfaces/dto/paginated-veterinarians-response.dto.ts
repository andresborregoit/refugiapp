import { ApiProperty } from '@nestjs/swagger';
import { VeterinarianResponseDto } from './veterinarian-response.dto';

export class PaginatedVeterinariansResponseDto {
  @ApiProperty({ type: VeterinarianResponseDto, isArray: true })
  items!: VeterinarianResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}
