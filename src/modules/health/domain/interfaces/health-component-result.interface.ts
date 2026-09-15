export type HealthComponentStatus = 'up' | 'degraded' | 'down';

export type HealthCheckOverallStatus = 'ok' | 'degraded' | 'error';

export interface HealthComponentData {
  status: HealthComponentStatus;
  [key: string]: unknown;
}

export type HealthComponentResult = Record<string, HealthComponentData>;

export interface HealthCheckResponse {
  status: HealthCheckOverallStatus;
  info?: HealthComponentResult;
  error?: HealthComponentResult;
  details: HealthComponentResult;
}