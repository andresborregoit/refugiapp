import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: AuthenticatedUser }>();
    const { method, originalUrl } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          this.logger.log({
            msg: 'request.completed',
            method,
            path: originalUrl,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            userId: request.user?.id,
          });
        },
        error: (error: unknown) => {
          const statusCode = error instanceof HttpException ? error.getStatus() : 500;
          this.logger.warn({
            msg: 'request.failed',
            method,
            path: originalUrl,
            statusCode,
            durationMs: Date.now() - startedAt,
            userId: request.user?.id,
          });
        },
      }),
    );
  }
}