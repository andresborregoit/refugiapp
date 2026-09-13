import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';

export class ListMediaQueryDto {
  @ApiProperty({ enum: MediaOwnerType, description: 'The type of the owner entity' })
  @IsEnum(MediaOwnerType)
  ownerType!: MediaOwnerType;

  @ApiProperty({ description: 'The UUID of the owner entity' })
  @IsUUID()
  ownerId!: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;
}