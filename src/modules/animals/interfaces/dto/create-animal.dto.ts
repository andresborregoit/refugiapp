import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';

export class CreateAnimalDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'dog' })
  @IsString()
  species!: string;

  @ApiPropertyOptional({ enum: AnimalSex, default: AnimalSex.UNKNOWN })
  @IsOptional()
  @IsEnum(AnimalSex)
  sex?: AnimalSex;

  @ApiPropertyOptional({ enum: AnimalStatus, default: AnimalStatus.ADMITTED })
  @IsOptional()
  @IsEnum(AnimalStatus)
  status?: AnimalStatus;

  @ApiProperty()
  @IsDateString()
  intakeDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  profilePhotoMediaId?: string;
}
