import { DocumentBuilder } from '@nestjs/swagger';

export const OPENAPI_VERSION = '1.0';

export function createSwaggerConfig(): ReturnType<DocumentBuilder['build']> {
  return new DocumentBuilder()
    .setTitle('Refugiapp API')
    .setDescription('API para la gestion de refugios de animales.')
    .setVersion(OPENAPI_VERSION)
    .addBearerAuth()
    .build();
}