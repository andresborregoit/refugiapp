import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL !== 'false',
  rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
  poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true',
  logging: process.env.TYPEORM_LOGGING === 'true',
}));
