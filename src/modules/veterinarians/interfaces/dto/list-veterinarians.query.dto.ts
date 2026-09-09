import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function trimOrUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();

  return trimmed || undefined;
}

function toOptionalBoolean({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return value;
}

export class ListVeterinariansQueryDto {
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

  @ApiPropertyOptional({ example: 'sofia' })
  @Transform(trimOrUndefined)
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'VET-001' })
  @Transform(trimOrUndefined)
  @IsString()
  @IsOptional()
  licenseNumber?: string;

  @ApiPropertyOptional({ default: true })
  @Transform(toOptionalBoolean)
  @IsBoolean()
  @IsOptional()
  isActive = true;
}
