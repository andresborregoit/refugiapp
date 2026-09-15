import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import helmet from 'helmet';
import request from 'supertest';
import {
  RATE_LIMIT_PROFILES,
  UseRateLimitProfile,
} from '../src/common/decorators/rate-limit-profile.decorator';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { createRateLimitOptions } from '../src/config/rate-limit.config';

@Controller('security-test')
class SecurityTestController {
  @Get('general')
  general(): { status: string } {
    return { status: 'ok' };
  }

  @Get('login')
  @UseRateLimitProfile(RATE_LIMIT_PROFILES.LOGIN)
  login(): { status: string } {
    return { status: 'ok' };
  }
}

describe('HTTP security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              security: {
                rateLimit: {
                  general: { limit: 3, ttlMs: 200 },
                  login: { limit: 1, ttlMs: 200 },
                },
              },
            }),
          ],
        }),
        ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: createRateLimitOptions,
        }),
      ],
      controllers: [SecurityTestController],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(helmet({ contentSecurityPolicy: false }));
    app.enableCors();
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies security headers and the general limit', async () => {
    const firstResponse = await request(app.getHttpServer())
      .get('/api/v1/security-test/general')
      .expect(200);

    expect(firstResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(firstResponse.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(firstResponse.headers['referrer-policy']).toBe('no-referrer');
    expect(firstResponse.headers['x-ratelimit-limit-general']).toBe('3');
    expect(firstResponse.headers['access-control-allow-origin']).toBe('*');

    await request(app.getHttpServer()).get('/api/v1/security-test/general').expect(200);
    await request(app.getHttpServer()).get('/api/v1/security-test/general').expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/security-test/general')
      .expect(429)
      .expect(({ body, headers }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            path: '/api/v1/security-test/general',
          }),
        );
        expect(headers['retry-after-general']).toBeDefined();
      });
  });

  it('uses a stricter independent limit for login and recovers after the window', async () => {
    const firstResponse = await request(app.getHttpServer())
      .get('/api/v1/security-test/login')
      .expect(200);

    expect(firstResponse.headers['x-ratelimit-limit-login']).toBe('1');

    await request(app.getHttpServer())
      .get('/api/v1/security-test/login')
      .expect(429)
      .expect(({ body }) => {
        expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      });

    await new Promise((resolve) => setTimeout(resolve, 250));

    await request(app.getHttpServer()).get('/api/v1/security-test/login').expect(200);
  });
});
