import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';

export class UploadMediaAssetBodyDto {
  @ApiPropertyOptional({
    enum: MediaOwnerType,
    description:
      'Owner entity type. Omit together with ownerId to upload an orphan asset and link it later.',
  })
  @IsOptional()
  @IsEnum(MediaOwnerType)
  ownerType?: MediaOwnerType;

  @ApiPropertyOptional({
    description:
      'The UUID of the owner entity. Omit together with ownerType to upload an orphan asset.',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}