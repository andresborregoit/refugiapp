import { Controller, Get, HttpCode, INestApplication, Post } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { SkipThrottle, ThrottlerModule } from '@nestjs/throttler';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LoginEndpoint } from '../src/common/decorators/login-endpoint.decorator';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ThrottlerBehindProxyGuard } from '../src/common/guards/throttler-behind-proxy.guard';
import { correlationIdMiddleware } from '../src/common/middleware/correlation-id.middleware';
import { applySecurityHeaders, configureCors } from '../src/common/security/http-security';
import { createThrottlerOptions } from '../src/config/throttler.factory';

@Controller('probe')
class RateLimitProbeController {
  @Get('general')
  general(): { ok: true } {
    return { ok: true };
  }

  @Post('login')
  @HttpCode(200)
  @LoginEndpoint()
  login(): { ok: true } {
    return { ok: true };
  }

  @Get('health')
  @SkipThrottle()
  health(): { ok: true } {
    return { ok: true };
  }
}

const generalLimit = 3;
const loginLimit = 2;

function loadTestConfig() {
  return {
    throttle: {
      generalTtlMs: 60000,
      generalLimit,
      loginTtlMs: 60000,
      loginLimit,
      errorMessage: 'Too many requests. Please try again later.',
    },
    app: {
      nodeEnv: 'test',
      corsOrigins: ['https://app.example.com'],
    },
  };
}

async function createProbeApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [loadTestConfig],
      }),
      ThrottlerModule.forRootAsync({
        inject: [ConfigService],
        useFactory: createThrottlerOptions,
      }),
    ],
    controllers: [RateLimitProbeController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard }],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = app.get(ConfigService);
  app.setGlobalPrefix('api/v1');
  applySecurityHeaders(app);
  configureCors(app, configService);
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return app;
}

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createProbeApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows requests under the general limit and rejects the next with a consistent 429', async () => {
    const server = app.getHttpServer();

    for (let attempt = 0; attempt < generalLimit; attempt += 1) {
      const allowed = await request(server).get('/api/v1/probe/general').expect(200);
      expect(Number(allowed.headers['x-ratelimit-remaining'])).toBe(
        generalLimit - attempt - 1,
      );
    }

    const rejected = await request(server).get('/api/v1/probe/general').expect(429);

    expect(rejected.body).toMatchObject({
      statusCode: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      error: 'TOO_MANY_REQUESTS',
      path: '/api/v1/probe/general',
    });
    expect(rejected.body.requestId).toEqual(expect.any(String));
    expect(Number(rejected.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('enforces a stricter limit for login-like endpoints', async () => {
    const server = app.getHttpServer();

    for (let attempt = 0; attempt < loginLimit; attempt += 1) {
      const allowed = await request(server).post('/api/v1/probe/login').send({}).expect(200);
      expect(Number(allowed.headers['x-ratelimit-remaining-login'])).toBe(
        loginLimit - attempt - 1,
      );
    }

    const rejected = await request(server).post('/api/v1/probe/login').send({}).expect(429);

    expect(rejected.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(Number(rejected.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('does not throttle health-like endpoints', async () => {
    const server = app.getHttpServer();

    for (let attempt = 0; attempt < 20; attempt += 1) {
      await request(server).get('/api/v1/probe/health').expect(200);
    }
  });
});

describe('Security headers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createProbeApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets the expected security headers', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/probe/health').expect(200);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('reflects an allowed frontend origin on CORS responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/health')
      .set('Origin', 'https://app.example.com')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  it('does not reflect origins outside the configured whitelist', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/health')
      .set('Origin', 'https://evil.example.com')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});