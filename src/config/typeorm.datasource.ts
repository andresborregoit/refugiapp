import 'dotenv/config';
import { DataSource } from 'typeorm';

const sslEnabled = process.env.DB_SSL !== 'false';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/**/*.orm-entity.ts'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      }
    : false,
});
