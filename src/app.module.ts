import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnimalsModule } from './modules/animals/animals.module';
import { AuthModule } from './modules/auth/auth.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { MediaModule } from './modules/media/media.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { UsersModule } from './modules/users/users.module';
import { VeterinariansModule } from './modules/veterinarians/veterinarians.module';
import { appConfig } from './config/app.config';
import { cloudinaryConfig } from './config/cloudinary.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { createTypeOrmOptions } from './config/typeorm.config';
import { envValidationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, cloudinaryConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
