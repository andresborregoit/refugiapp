import { ApiProperty } from '@nestjs/swagger';
import { BreedResponseDto } from './breed-response.dto';

export class BreedListResponseDto {
  @ApiProperty({ type: BreedResponseDto, isArray: true })
  items!: BreedResponseDto[];
}