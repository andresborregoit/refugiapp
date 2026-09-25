import { ApiProperty } from '@nestjs/swagger';

export class SpeciesResponseDto {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id!: string;

  @ApiProperty({ example: 'dog' })
  slug!: string;

  @ApiProperty({ example: 'Perro' })
  labelEs!: string;
}