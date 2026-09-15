import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnimalsModule } from './modules/animals/animals.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HealthModule } from './modules/health/health.module';
import { MediaModule } from './modules/media/media.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { UsersModule } from './modules/users/users.module';
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module';
import { appConfig } from './config/app.config';
import { cloudinaryConfig } from './config/cloudinary.config';
import { databaseConfig } from './config/database.config';
import { healthConfig } from './config/health.config';
import { jwtConfig } from './config/jwt.config';
import { throttleConfig } from './config/throttle.config';
import { createThrottlerOptions } from './config/throttler.factory';
import { createTypeOrmOptions } from './config/typeorm.config';
import { envValidationSchema } from './config/validation.schema';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, cloudinaryConfig, healthConfig, throttleConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createThrottlerOptions,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: createTypeOrmOptions,
    }),
    AuthModule,
    UsersModule,
    AnimalsModule,
    MedicalRecordsModule,
    VeterinariansModule,
    ExpensesModule,
    MediaModule,
    AuditLogsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
