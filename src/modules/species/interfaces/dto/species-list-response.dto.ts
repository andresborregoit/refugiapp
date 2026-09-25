import { ApiProperty } from '@nestjs/swagger';
import { SpeciesResponseDto } from './species-response.dto';

export class SpeciesListResponseDto {
  @ApiProperty({ type: SpeciesResponseDto, isArray: true })
  items!: SpeciesResponseDto[];
}