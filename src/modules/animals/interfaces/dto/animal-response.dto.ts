import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';

export class AnimalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  species!: string;

  @ApiPropertyOptional({ nullable: true })
  breed?: string | null;

  @ApiProperty({ enum: AnimalSex })
  sex!: AnimalSex;

  @ApiProperty({ enum: AnimalStatus })
  status!: AnimalStatus;

  @ApiProperty({ type: String, format: 'date' })
  intakeDate!: Date;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  birthDate?: Date | null;

  @ApiPropertyOptional({ nullable: true })
  notes?: string | null;

  @ApiPropertyOptional({ nullable: true })
  profilePhotoMediaId?: string | null;
}
