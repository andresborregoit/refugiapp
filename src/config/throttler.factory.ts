import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { LOGIN_ENDPOINT_METADATA } from '../common/decorators/login-endpoint.decorator';

function isLoginRoute(context: ExecutionContext): boolean {
  return Reflect.getMetadata(LOGIN_ENDPOINT_METADATA, context.getHandler()) === true;
}

export function createThrottlerOptions(configService: ConfigService): ThrottlerModuleOptions {
  return {
    throttlers: [
      {
        name: 'default',
        ttl: configService.get<number>('throttle.generalTtlMs', 60000),
        limit: configService.get<number>('throttle.generalLimit', 100),
        skipIf: isLoginRoute,
      },
      {
        name: 'login',
        ttl: configService.get<number>('throttle.loginTtlMs', 60000),
        limit: configService.get<number>('throttle.loginLimit', 5),
        skipIf: (context) => !isLoginRoute(context),
      },
    ],
    errorMessage: configService.get<string>(
      'throttle.errorMessage',
      'Too many requests. Please try again later.',
    ),
  };
}