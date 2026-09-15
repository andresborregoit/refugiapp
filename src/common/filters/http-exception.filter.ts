import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../interfaces/error-response.dto';
import { getRequestId } from '../storage/request-context';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.buildPayload(exception, status, request.url);
    this.logException(exception, status, payload);

    response.status(status).json(payload);
  }

  private logException(exception: unknown, status: number, payload: ErrorResponseDto): void {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        { msg: 'request.internal_error', statusCode: status, code: payload.code },
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn({
        msg: 'request.rejected',
        statusCode: status,
        code: payload.code,
        message: payload.message,
      });
    }
  }

  private buildPayload(
    exception: unknown,
    status: number,
    path: string,
  ): ErrorResponseDto {
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const responseObject =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as Record<string, unknown>)
        : {};
    const message = isServerError
      ? 'Internal server error.'
      : this.readMessage(exceptionResponse, status);

    return {
      statusCode: status,
      code: isServerError
        ? 'INTERNAL_SERVER_ERROR'
        : this.readCode(responseObject, status),
      message,
      error: isServerError
        ? 'Internal Server Error'
        : this.readError(responseObject, status),
      timestamp: new Date().toISOString(),
      path,
      requestId: getRequestId(),
    };
  }

  private readMessage(response: string | object | null, status: number): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (response && typeof response === 'object' && 'message' in response) {
      const message = response.message;

      if (typeof message === 'string' || Array.isArray(message)) {
        return message as string | string[];
      }
    }

    return HttpStatus[status] ?? 'Request failed.';
  }

  private readCode(response: Record<string, unknown>, status: number): string {
    if (typeof response.code === 'string') {
      return response.code;
    }

    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMIT_EXCEEDED',
    };

    return codes[status] ?? 'HTTP_ERROR';
  }

  private readError(response: Record<string, unknown>, status: number): string {
    return typeof response.error === 'string' ? response.error : HttpStatus[status] ?? 'Error';
  }
}