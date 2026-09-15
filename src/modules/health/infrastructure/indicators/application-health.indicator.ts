import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from '../../../../app.service';
import { HealthComponentResult } from '../../domain/interfaces/health-component-result.interface';

@Injectable()
export class ApplicationHealthIndicator {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  check(): HealthComponentResult {
    const metadata = this.appService.getHealth();

    return {
      app: {
        status: 'up',
        name: metadata.name,
        version: metadata.version,
        nodeEnv: this.configService.get<string>('app.nodeEnv', 'development'),
        uptimeMs: Math.round(process.uptime() * 1000),
      },
    };
  }
}