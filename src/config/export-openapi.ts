import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { createSwaggerConfig, OPENAPI_VERSION } from './swagger.config';

const OUTPUT_PATH = join(__dirname, '..', '..', 'docs', 'openapi.json');

const REQUIRED_ENV_DEFAULTS: Record<string, string> = {
  DATABASE_URL: 'postgresql://openapi-export:openapi-export@localhost:5432/refugiapp_export',
  DB_SSL: 'false',
  JWT_SECRET: 'openapi-export-only-secret-with-at-least-32-characters',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
};

const SENSITIVE_PATTERNS = [
  /postgres(ql)?:\/\/[^\s"']*:[^\s"']*@/i,
  /JWT_SECRET/i,
  /CLOUDINARY_API_SECRET/i,
  /cloudinary:\/\/[^\s"']*/i,
];

function ensureEnvironment(): void {
  for (const [key, value] of Object.entries(REQUIRED_ENV_DEFAULTS)) {
    process.env[key] = value;
  }
}

function assertNoSecrets(json: string): void {
  const leaks = SENSITIVE_PATTERNS.map((pattern) => pattern.test(json)).filter(Boolean).length;

  if (leaks > 0) {
    throw new Error('Refusing to write openapi.json: sensitive value detected in the document.');
  }
}

function createStubDataSource(): DataSource {
  return {
    entityMetadatas: [],
    options: { type: 'postgres' },
    getRepository: () => ({}),
    manager: {},
    isInitialized: false,
    destroy: async () => undefined,
  } as unknown as DataSource;
}

async function exportOpenApi(): Promise<void> {
  ensureEnvironment();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(getDataSourceToken())
    .useValue(createStubDataSource())
    .compile();

  const app = moduleRef.createNestApplication();
  const apiPrefix = moduleRef.get(ConfigService).get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  const document = SwaggerModule.createDocument(app, createSwaggerConfig());

  const json = `${JSON.stringify(document, null, 2)}\n`;
  assertNoSecrets(json);

  writeFileSync(OUTPUT_PATH, json, 'utf8');

  const pathCount = Object.keys(document.paths).length;
  const schemaCount = Object.keys(document.components?.schemas ?? {}).length;

  console.info(
    `OpenAPI ${OPENAPI_VERSION} exported to docs/openapi.json with ${pathCount} paths and ${schemaCount} schemas.`,
  );
}

if (require.main === module) {
  exportOpenApi().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown OpenAPI export error.';

    console.error(message);
    process.exitCode = 1;
  });
}