import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { Response } from 'express';
import { HealthAggregatorService } from '../../application/services/health-aggregator.service';
import { HealthCheckResponse } from '../../domain/interfaces/health-component-result.interface';
import { ApplicationHealthIndicator } from '../../infrastructure/indicators/application-health.indicator';
import { DatabaseHealthIndicator } from '../../infrastructure/indicators/database-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly aggregator: HealthAggregatorService,
    private readonly applicationIndicator: ApplicationHealthIndicator,
    private readonly databaseIndicator: DatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe. Returns 200 while the process is alive.' })
  liveness(): Promise<HealthCheckResponse> {
    return this.aggregator.check([() => this.applicationIndicator.check()]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe. Checks the application and the database connection.',
  })
  async readiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthCheckResponse> {
    const result = await this.aggregator.check([
      () => this.applicationIndicator.check(),
      () => this.databaseIndicator.check(),
    ]);

    if (result.status === 'error') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return result;
  }
}