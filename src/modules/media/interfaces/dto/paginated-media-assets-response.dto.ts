import { ApiProperty } from '@nestjs/swagger';
import { MediaAssetResponseDto } from './media-asset-response.dto';

export class PaginatedMediaAssetsResponseDto {
  @ApiProperty({ type: MediaAssetResponseDto, isArray: true })
  items!: MediaAssetResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}