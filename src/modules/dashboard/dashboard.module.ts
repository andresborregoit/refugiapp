import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalOrmEntity } from '../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { DashboardService } from './application/services/dashboard.service';
import { DASHBOARD_REPOSITORY } from './domain/repositories/dashboard.repository';
import { TypeOrmDashboardRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-dashboard.repository';
import { DashboardController } from './interfaces/controllers/dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnimalOrmEntity])],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: DASHBOARD_REPOSITORY,
      useClass: TypeOrmDashboardRepository,
    },
  ],
})
export class DashboardModule {}