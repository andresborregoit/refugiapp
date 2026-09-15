import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppService } from '../src/app.service';
import { HttpLoggingInterceptor } from '../src/common/interceptors/http-logging.interceptor';
import { correlationIdMiddleware } from '../src/common/middleware/correlation-id.middleware';
import { HealthAggregatorService } from '../src/modules/health/application/services/health-aggregator.service';
import { ApplicationHealthIndicator } from '../src/modules/health/infrastructure/indicators/application-health.indicator';
import { DatabaseHealthIndicator } from '../src/modules/health/infrastructure/indicators/database-health.indicator';
import { HealthController } from '../src/modules/health/interfaces/controllers/health.controller';

describe('Health (e2e)', () => {
  let app: INestApplication;
  let dataSourceQuery: jest.Mock;
  let configGet: jest.Mock;
  let degradedLatencyMs = 500;

  beforeAll(async () => {
    dataSourceQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    configGet = jest.fn().mockImplementation((key: string, defaultValue: unknown) => {
      if (key === 'health.degradedLatencyMs') {
        return degradedLatencyMs;
      }
      if (key === 'health.dbTimeoutMs') {
        return 1000;
      }
      return defaultValue;
    });

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        AppService,
        HealthAggregatorService,
        ApplicationHealthIndicator,
        DatabaseHealthIndicator,
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
        {
          provide: DataSource,
          useValue: { query: dataSourceQuery },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(correlationIdMiddleware);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalInterceptors(new HttpLoggingInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    degradedLatencyMs = 500;
    dataSourceQuery.mockReset();
    dataSourceQuery.mockResolvedValue([{ '?column?': 1 }]);
  });

  it('liveness returns ok with the application component up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.details.app.status).toBe('up');
    expect(response.body.details.app.name).toBe('refugiapp-api');
  });

  it('readiness returns ok when the database responds within limits', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.details.database.status).toBe('up');
  });

  it('readiness returns degraded with 200 when the database is slow', async () => {
    degradedLatencyMs = 1;
    dataSourceQuery.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([{ '?column?': 1 }]), 10);
        }),
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body.status).toBe('degraded');
    expect(response.body.details.database.status).toBe('degraded');
  });

  it('readiness returns 503 with error when the database is down', async () => {
    dataSourceQuery.mockRejectedValue(new Error('connection refused'));

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);

    expect(response.body.status).toBe('error');
    expect(response.body.error.database.status).toBe('down');
    expect(response.body.details.database.status).toBe('down');
  });

  it('propagates the correlation id on requests and responses', async () => {
    dataSourceQuery.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .set('x-request-id', 'my-correlation-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('my-correlation-id');
  });
});