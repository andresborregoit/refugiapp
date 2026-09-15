import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';

function trimOrUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

export class ListAnimalsQueryDto {
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

  @ApiPropertyOptional({ enum: AnimalStatus })
  @IsEnum(AnimalStatus)
  @IsOptional()
  status?: AnimalStatus;

  @ApiPropertyOptional({ example: 'dog' })
  @Transform(trimOrUndefined)
  @IsString()
  @IsOptional()
  species?: string;

  @ApiPropertyOptional({ enum: AnimalSex })
  @IsEnum(AnimalSex)
  @IsOptional()
  sex?: AnimalSex;

  @ApiPropertyOptional({ example: 'luna' })
  @Transform(trimOrUndefined)
  @IsString()
  @IsOptional()
  name?: string;
}
