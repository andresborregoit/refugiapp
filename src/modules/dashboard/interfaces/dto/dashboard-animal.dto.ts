import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';

export class DashboardAnimalDto {
  @ApiProperty({ format: 'uuid', example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id!: string;

  @ApiProperty({ example: 'Luna' })
  name!: string;

  @ApiProperty({ example: 'dog' })
  species!: string;

  @ApiProperty({ enum: AnimalStatus })
  status!: AnimalStatus;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description:
      'UUID del asset de media que actua como foto de perfil; null si el animal no tiene foto.',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  profilePhotoMediaId?: string | null;
}