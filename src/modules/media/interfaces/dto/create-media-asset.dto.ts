import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';

export class CreateMediaAssetDto {
  @ApiProperty({ enum: MediaOwnerType })
  @IsEnum(MediaOwnerType)
  ownerType!: MediaOwnerType;

  @ApiProperty()
  @IsUUID()
  ownerId!: string;

  @ApiProperty({ enum: MediaResourceType, default: MediaResourceType.IMAGE })
  @IsEnum(MediaResourceType)
  resourceType!: MediaResourceType;

  @ApiProperty()
  @IsString()
  cloudinaryPublicId!: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  secureUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uploadedByUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
