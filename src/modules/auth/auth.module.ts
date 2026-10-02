import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthService } from './application/services/auth.service';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { PASSWORD_RESET_TOKEN_REPOSITORY } from './domain/repositories/password-reset-token.repository';
import { PASSWORD_NOTIFICATION_GATEWAY } from './domain/services/password-notification.gateway';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/typeorm/entities/refresh-token.orm-entity';
import { PasswordResetTokenOrmEntity } from './infrastructure/persistence/typeorm/entities/password-reset-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-refresh-token.repository';
import { TypeOrmPasswordResetTokenRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-password-reset-token.repository';
import { WebhookPasswordNotificationGateway } from './infrastructure/notifications/webhook-password-notification.gateway';
import { AuthController } from './interfaces/controllers/auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshTokenOrmEntity, PasswordResetTokenOrmEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn', '1d') as any,
          issuer: configService.get<string>('jwt.issuer', 'refugiapp-api'),
          audience: configService.get<string>('jwt.audience', 'refugiapp-mobile'),
        },
      }),
    }),
    UsersModule,
    AuditLogsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: TypeOrmRefreshTokenRepository,
    },
    {
      provide: PASSWORD_RESET_TOKEN_REPOSITORY,
      useClass: TypeOrmPasswordResetTokenRepository,
    },
    {
      provide: PASSWORD_NOTIFICATION_GATEWAY,
      useClass: WebhookPasswordNotificationGateway,
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule, REFRESH_TOKEN_REPOSITORY],
})
export class AuthModule {}
