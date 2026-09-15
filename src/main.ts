import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { correlationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { applySecurityHeaders, configureCors } from './common/security/http-security';
import { AuditForbiddenFilter } from './modules/audit-logs/interfaces/filters/audit-forbidden.filter';

async function bootstrap(): Promise<void> {
  const logger = new JsonLoggerService();
  const app = await NestFactory.create(AppModule, { logger });
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  logger.setLogLevels([configService.get('app.logLevel', 'log')]);

  app.getHttpAdapter().getInstance().set('trust proxy', configService.get<number>('app.trustProxy', 0));

  applySecurityHeaders(app);

  app.use(correlationIdMiddleware);
  configureCors(app, configService);
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
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    app.get(AuditForbiddenFilter),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Refugiapp API')
    .setDescription('API para la gestion de refugios de animales.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);
}

void bootstrap();
