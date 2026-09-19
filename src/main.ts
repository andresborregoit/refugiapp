import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { createSwaggerConfig } from './config/swagger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { AuditForbiddenFilter } from './modules/audit-logs/interfaces/filters/audit-forbidden.filter';

async function bootstrap(): Promise<void> {
  const logger = new JsonLoggerService();
  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  const trustProxyHops = configService.get<number>('security.trustProxyHops', 0);
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);

  logger.setLogLevels([configService.get('app.logLevel', 'log')]);

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(correlationIdMiddleware);
  app.enableCors();
  app.useGlobalInterceptors(new HttpLoggingInterceptor());
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
  app.useGlobalFilters(new HttpExceptionFilter(), app.get(AuditForbiddenFilter));

  const swaggerDocument = SwaggerModule.createDocument(app, createSwaggerConfig());
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
}

void bootstrap();
