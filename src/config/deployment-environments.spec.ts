import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { envValidationSchema } from './validation.schema';

const environmentExamples = [
  {
    file: '.env.development.example',
    appEnvironment: 'development',
    nodeEnvironment: 'development',
  },
  {
    file: '.env.staging.example',
    appEnvironment: 'staging',
    nodeEnvironment: 'production',
  },
  {
    file: '.env.production.example',
    appEnvironment: 'production',
    nodeEnvironment: 'production',
  },
] as const;

describe('deployment environment examples', () => {
  it.each(environmentExamples)(
    'validates $appEnvironment configuration after secret injection',
    ({ file, appEnvironment, nodeEnvironment }) => {
      const example = parse(readFileSync(join(process.cwd(), file)));
      const environment = {
        ...example,
        DATABASE_URL: 'postgresql://localhost/refugiapp_test',
        JWT_SECRET: 'test-suite-secret-with-at-least-32-characters',
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-key',
        CLOUDINARY_API_SECRET: 'test-secret',
      };

      const result = envValidationSchema.validate(environment, { abortEarly: false });

      expect(result.error).toBeUndefined();
      expect(result.value.APP_ENV).toBe(appEnvironment);
      expect(result.value.NODE_ENV).toBe(nodeEnvironment);
      expect(result.value.TYPEORM_SYNCHRONIZE).toBe(false);
    },
  );

  it('keeps production examples free of usable secrets', () => {
    for (const file of ['.env.staging.example', '.env.production.example']) {
      const example = parse(readFileSync(join(process.cwd(), file)));

      expect(example.DATABASE_URL).toContain('USER:PASSWORD@HOST');
      expect(example.JWT_SECRET).toMatch(/^replace-with-/);
      expect(example.CLOUDINARY_API_SECRET).toBe('your-api-secret');
      expect(example.TYPEORM_SYNCHRONIZE).toBe('false');
    }
  });
});
