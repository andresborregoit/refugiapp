import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';

export class UpdateAnimalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'dog' })
  @IsOptional()
  @IsString()
  species?: string;

  @ApiPropertyOptional({ type: String, example: 'mixed', nullable: true })
  @IsOptional()
  @IsString()
  breed?: string | null;

  @ApiPropertyOptional({ enum: AnimalSex })
  @IsOptional()
  @IsEnum(AnimalSex)
  sex?: AnimalSex;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  intakeDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  profilePhotoMediaId?: string | null;
}
