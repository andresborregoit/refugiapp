import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';

export class UploadMediaAssetBodyDto {
  @ApiProperty({ enum: MediaOwnerType, description: 'The type of the owner entity' })
  @IsEnum(MediaOwnerType)
  @IsNotEmpty()
  ownerType!: MediaOwnerType;

  @ApiProperty({ description: 'The UUID of the owner entity' })
  @IsUUID()
  @IsNotEmpty()
  ownerId!: string;
}
