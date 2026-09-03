import { envValidationSchema } from './validation.schema';

function baseEnv(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:pass@localhost/testdb',
    JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
    ...overrides,
  };
}

describe('envValidationSchema', () => {
  describe('configuracion valida (development)', () => {
    it('acepta variables por defecto', () => {
      const result = envValidationSchema.validate(baseEnv(), { abortEarly: false });
      expect(result.error).toBeUndefined();
      expect(result.value.NODE_ENV).toBe('development');
      expect(result.value.PORT).toBe(3000);
      expect(result.value.TYPEORM_SYNCHRONIZE).toBe(false);
    });

    it('acepta variables explícitas válidas', () => {
      const env = baseEnv({
        PORT: '4000',
        DB_SSL: 'true',
        DB_POOL_SIZE: '20',
        TYPEORM_LOGGING: 'true',
        JWT_EXPIRES_IN: '7d',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeUndefined();
      expect(result.value.PORT).toBe(4000);
      expect(result.value.DB_POOL_SIZE).toBe(20);
    });
  });

  describe('configuracion valida (test)', () => {
    it('acepta NODE_ENV=test', () => {
      const env = baseEnv({ NODE_ENV: 'test' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeUndefined();
      expect(result.value.NODE_ENV).toBe('test');
    });

    it('no requiere Cloudinary en test', () => {
      const env = baseEnv({ NODE_ENV: 'test' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeUndefined();
    });
  });

  describe('configuracion invalida', () => {
    it('rechaza NODE_ENV invalido', () => {
      const env = baseEnv({ NODE_ENV: 'staging' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('NODE_ENV'))).toBe(true);
    });

    it('rechaza DATABASE_URL ausente', () => {
      const env = baseEnv();
      delete env.DATABASE_URL;
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('DATABASE_URL'))).toBe(true);
    });

    it('rechaza DATABASE_URL con esquema invalido', () => {
      const env = baseEnv({ DATABASE_URL: 'mysql://user:pass@localhost/db' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('DATABASE_URL'))).toBe(true);
    });

    it('rechaza JWT_SECRET ausente', () => {
      const env = baseEnv();
      delete env.JWT_SECRET;
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('JWT_SECRET'))).toBe(true);
    });

    it('rechaza JWT_SECRET con menos de 32 caracteres', () => {
      const env = baseEnv({ JWT_SECRET: 'short' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('JWT_SECRET'))).toBe(true);
    });

    it('rechaza PORT no numerico', () => {
      const env = baseEnv({ PORT: 'abc' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('PORT'))).toBe(true);
    });

    it('rechaza DB_POOL_SIZE fuera de rango', () => {
      const env = baseEnv({ DB_POOL_SIZE: '100' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('DB_POOL_SIZE'))).toBe(true);
    });

    it('rechaza EMAIL invalido en INITIAL_ADMIN_EMAIL', () => {
      const env = baseEnv({ INITIAL_ADMIN_EMAIL: 'not-an-email' });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('INITIAL_ADMIN_EMAIL'))).toBe(true);
    });
  });

  describe('produccion', () => {
    it('acepta configuracion valida con Cloudinary', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        TYPEORM_SYNCHRONIZE: 'false',
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: 'key-123',
        CLOUDINARY_API_SECRET: 'secret-456',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeUndefined();
    });

    it('rechaza TYPEORM_SYNCHRONIZE=true en produccion', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        TYPEORM_SYNCHRONIZE: 'true',
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: 'key-123',
        CLOUDINARY_API_SECRET: 'secret-456',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(result.error!.details.some((d) => d.path.includes('TYPEORM_SYNCHRONIZE'))).toBe(true);
    });

    it('acepta TYPEORM_SYNCHRONIZE=false en produccion', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        TYPEORM_SYNCHRONIZE: 'false',
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: 'key-123',
        CLOUDINARY_API_SECRET: 'secret-456',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeUndefined();
      expect(result.value.TYPEORM_SYNCHRONIZE).toBe(false);
    });

    it('rechaza CLOUDINARY_CLOUD_NAME ausente en produccion', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        CLOUDINARY_API_KEY: 'key-123',
        CLOUDINARY_API_SECRET: 'secret-456',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(
        result.error!.details.some(
          (d) => d.path.includes('CLOUDINARY_CLOUD_NAME') && d.type === 'any.required',
        ),
      ).toBe(true);
    });

    it('rechaza CLOUDINARY_API_KEY ausente en produccion', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_SECRET: 'secret-456',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(
        result.error!.details.some(
          (d) => d.path.includes('CLOUDINARY_API_KEY') && d.type === 'any.required',
        ),
      ).toBe(true);
    });

    it('rechaza CLOUDINARY_API_SECRET ausente en produccion', () => {
      const env = baseEnv({
        NODE_ENV: 'production',
        CLOUDINARY_CLOUD_NAME: 'my-cloud',
        CLOUDINARY_API_KEY: 'key-123',
      });
      const result = envValidationSchema.validate(env, { abortEarly: false });
      expect(result.error).toBeDefined();
      expect(
        result.error!.details.some(
          (d) => d.path.includes('CLOUDINARY_API_SECRET') && d.type === 'any.required',
        ),
      ).toBe(true);
    });
  });
});
