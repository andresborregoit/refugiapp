import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createTypeOrmOptions(configService: ConfigService): TypeOrmModuleOptions {
  const sslEnabled = configService.get<boolean>('database.ssl', true);

  return {
    type: 'postgres',
    url: configService.getOrThrow<string>('database.url'),
    autoLoadEntities: true,
    synchronize: configService.get<boolean>('database.synchronize', false),
    logging: configService.get<boolean>('database.logging', false),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: configService.get<boolean>('database.rejectUnauthorized', false),
        }
      : false,
    extra: {
      max: configService.get<number>('database.poolSize', 10),
    },
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  };
}
