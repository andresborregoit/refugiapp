import { ApiProperty } from '@nestjs/swagger';
import { DashboardAnimalDto } from './dashboard-animal.dto';
import { DashboardTotalsDto } from './dashboard-totals.dto';

export class DashboardOverviewResponseDto {
  @ApiProperty({ type: DashboardTotalsDto, description: 'Indicadores globales del refugio.' })
  totals!: DashboardTotalsDto;

  @ApiProperty({
    type: DashboardAnimalDto,
    isArray: true,
    description: 'Animales mas recientes para el panel de control.',
  })
  recentAnimals!: DashboardAnimalDto[];
}