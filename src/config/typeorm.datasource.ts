import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

const sslEnabled = process.env.DB_SSL !== 'false';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '..', '**', '*.orm-entity.{js,ts}')],
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{js,ts}')],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true',
  ssl: sslEnabled
    ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
      }
    : false,
});
