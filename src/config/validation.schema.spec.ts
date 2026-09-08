import { envValidationSchema } from './validation.schema';

describe('environment validation schema', () => {
  const baseEnvironment = {
    DATABASE_URL: 'postgresql://user:password@localhost/refugiapp',
    JWT_SECRET: 'a-secure-jwt-secret-with-more-than-32-characters',
    CLOUDINARY_CLOUD_NAME: 'refugiapp-test',
    CLOUDINARY_API_KEY: 'cloudinary-api-key',
    CLOUDINARY_API_SECRET: 'cloudinary-api-secret',
  };

  it('accepts valid development configuration', () => {
    const environment = Object.fromEntries(
      Object.entries(baseEnvironment).filter(([key]) => !key.startsWith('CLOUDINARY_')),
    );

    const result = envValidationSchema.validate({
      ...environment,
      NODE_ENV: 'development',
    });

    expect(result.error).toBeUndefined();
    expect(result.value.TYPEORM_SYNCHRONIZE).toBe(false);
  });

  it('accepts valid test configuration with synchronization enabled', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'test',
      TYPEORM_SYNCHRONIZE: true,
    });

    expect(result.error).toBeUndefined();
  });

  it('accepts valid production configuration', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      TYPEORM_SYNCHRONIZE: false,
    });

    expect(result.error).toBeUndefined();
  });

  it('rejects synchronization in production', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      TYPEORM_SYNCHRONIZE: true,
    });

    expect(result.error?.details.map(({ message }) => message)).toContain(
      'TYPEORM_SYNCHRONIZE must be false in production.',
    );
  });

  it('rejects a missing JWT secret', () => {
    const environment = Object.fromEntries(
      Object.entries(baseEnvironment).filter(([key]) => key !== 'JWT_SECRET'),
    );
    const result = envValidationSchema.validate(environment);

    expect(result.error?.details.some(({ path }) => path[0] === 'JWT_SECRET')).toBe(true);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      JWT_SECRET: 'too-short',
    });

    expect(result.error?.details.some(({ path }) => path[0] === 'JWT_SECRET')).toBe(true);
  });

  it('rejects a JWT placeholder in production', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      NODE_ENV: 'production',
      JWT_SECRET: 'replace-with-a-long-random-secret-at-least-32-characters',
    });

    expect(result.error?.details.map(({ message }) => message)).toContain(
      'JWT_SECRET must not be a placeholder in production.',
    );
  });

  it('rejects invalid database URLs', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      DATABASE_URL: 'https://database.example.com',
    });

    expect(result.error?.details.some(({ path }) => path[0] === 'DATABASE_URL')).toBe(true);
  });

  it('allows missing Cloudinary credentials outside production', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      CLOUDINARY_API_SECRET: '',
      NODE_ENV: 'test',
    });

    expect(result.error).toBeUndefined();
  });

  it('requires Cloudinary credentials in production', () => {
    const result = envValidationSchema.validate({
      ...baseEnvironment,
      CLOUDINARY_API_SECRET: '',
      NODE_ENV: 'production',
    });

    expect(result.error?.details.some(({ path }) => path[0] === 'CLOUDINARY_API_SECRET')).toBe(
      true,
    );
  });
});
