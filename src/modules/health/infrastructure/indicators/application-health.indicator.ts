import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APPLICATION_METADATA } from '../../../../common/constants/application-metadata';
import { HealthComponentResult } from '../../domain/interfaces/health-component-result.interface';

@Injectable()
export class ApplicationHealthIndicator {
  constructor(private readonly configService: ConfigService) {}

  check(): HealthComponentResult {
    return {
      app: {
        status: 'up',
        name: APPLICATION_METADATA.name,
        version: APPLICATION_METADATA.version,
        nodeEnv: this.configService.get<string>('app.nodeEnv', 'development'),
        uptimeMs: Math.round(process.uptime() * 1000),
      },
    };
  }
}
