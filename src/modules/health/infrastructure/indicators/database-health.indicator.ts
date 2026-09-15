import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { HealthComponentResult } from '../../domain/interfaces/health-component-result.interface';

@Injectable()
export class DatabaseHealthIndicator {
  private readonly logger = new Logger(DatabaseHealthIndicator.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthComponentResult> {
    const timeoutMs = this.configService.get<number>('health.dbTimeoutMs', 2000);
    const degradedLatencyMs = this.configService.get<number>('health.degradedLatencyMs', 500);
    const startedAt = Date.now();

    try {
      await this.withTimeout(this.dataSource.query('SELECT 1'), timeoutMs);
      const latencyMs = Date.now() - startedAt;

      if (latencyMs >= degradedLatencyMs) {
        return {
          database: {
            status: 'degraded',
            latencyMs,
            message: 'Database is responding but slower than the degraded threshold.',
          },
        };
      }

      return {
        database: {
          status: 'up',
          latencyMs,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed.', error instanceof Error ? error.message : String(error));
      return {
        database: {
          status: 'down',
          latencyMs: Date.now() - startedAt,
          message: 'Database is not reachable.',
        },
      };
    }
  }

  private withTimeout(promise: Promise<unknown>, timeoutMs: number): Promise<unknown> {
    let timer: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Database health check timed out after ${timeoutMs}ms.`)),
        timeoutMs,
      );
    });

    return Promise.race([promise, timeout]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
  }
}