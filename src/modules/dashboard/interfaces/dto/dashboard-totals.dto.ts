import { ApiProperty } from '@nestjs/swagger';

export class DashboardTotalsDto {
  @ApiProperty({ example: 42, description: 'Total de animales activos.' })
  animals!: number;

  @ApiProperty({
    description: 'Conteo de animales activos por estado; todos los estados del enum estan presentes.',
    example: {
      admitted: 12,
      under_treatment: 5,
      available_for_adoption: 20,
      adopted: 3,
      deceased: 2,
    },
  })
  byStatus!: Record<string, number>;
}