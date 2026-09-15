import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthAggregatorService } from './application/services/health-aggregator.service';
import { ApplicationHealthIndicator } from './infrastructure/indicators/application-health.indicator';
import { DatabaseHealthIndicator } from './infrastructure/indicators/database-health.indicator';
import { HealthController } from './interfaces/controllers/health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    HealthAggregatorService,
    ApplicationHealthIndicator,
    DatabaseHealthIndicator,
  ],
})
export class HealthModule {}