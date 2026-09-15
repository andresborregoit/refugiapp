import { Injectable } from '@nestjs/common';
import {
  HealthCheckResponse,
  HealthComponentData,
  HealthComponentResult,
} from '../../domain/interfaces/health-component-result.interface';

export type HealthCheckRunner = () =>
  | Promise<HealthComponentResult>
  | HealthComponentResult;

@Injectable()
export class HealthAggregatorService {
  async check(runners: HealthCheckRunner[]): Promise<HealthCheckResponse> {
    const results = await Promise.all(runners.map((runner) => Promise.resolve(runner())));

    const details: Record<string, HealthComponentData> = {};
    const info: Record<string, HealthComponentData> = {};
    const errors: Record<string, HealthComponentData> = {};

    for (const result of results) {
      Object.assign(details, result);
    }

    for (const [key, component] of Object.entries(details)) {
      if (component.status === 'down') {
        errors[key] = component;
      } else {
        info[key] = component;
      }
    }

    const hasError = Object.keys(errors).length > 0;
    const hasDegraded = Object.values(details).some(
      (component) => component.status === 'degraded',
    );

    const status: HealthCheckResponse['status'] = hasError
      ? 'error'
      : hasDegraded
        ? 'degraded'
        : 'ok';

    return {
      status,
      info: Object.keys(info).length > 0 ? info : undefined,
      error: hasError ? errors : undefined,
      details,
    };
  }
}