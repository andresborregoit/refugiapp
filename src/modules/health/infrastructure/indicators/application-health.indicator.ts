import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_NAME, APP_VERSION } from '../../../../common/constants/app-metadata';
import { HealthComponentResult } from '../../domain/interfaces/health-component-result.interface';

@Injectable()
export class ApplicationHealthIndicator {
  constructor(private readonly configService: ConfigService) {}

  check(): HealthComponentResult {
    return {
      app: {
        status: 'up',
        name: APP_NAME,
        version: APP_VERSION,
        nodeEnv: this.configService.get<string>('app.nodeEnv', 'development'),
        uptimeMs: Math.round(process.uptime() * 1000),
      },
    };
  }
}