import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ExceptionResponse = string | string[] | Record<string, unknown>;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: ExceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionResponse)
        : 'Internal server error';

    const payload = this.normalizeExceptionResponse(status, exceptionResponse);

    response.status(status).json({
      statusCode: status,
      code: payload.code,
      message: payload.message,
      ...(payload.details.length > 0 ? { details: payload.details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeExceptionResponse(
    status: HttpStatus,
    exceptionResponse: ExceptionResponse,
  ): { code: string; message: string; details: string[] } {
    const fallbackMessage = this.getDefaultMessage(status);
    const fallbackCode = this.getDefaultCode(status);

    if (typeof exceptionResponse === 'string') {
      return {
        code: fallbackCode,
        message: this.getSafeMessage(status, exceptionResponse || fallbackMessage),
        details: [],
      };
    }

    if (Array.isArray(exceptionResponse)) {
      return {
        code: fallbackCode,
        message: fallbackMessage,
        details: exceptionResponse,
      };
    }

    const rawMessage = exceptionResponse.message;
    const details = Array.isArray(rawMessage) ? rawMessage.filter(this.isString) : [];
    const message = typeof rawMessage === 'string' ? rawMessage : fallbackMessage;
    const code = typeof exceptionResponse.code === 'string' ? exceptionResponse.code : fallbackCode;

    return {
      code,
      message: this.getSafeMessage(status, message),
      details,
    };
  }

  private getSafeMessage(status: HttpStatus, message: string): string {
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    return message;
  }

  private getDefaultMessage(status: HttpStatus): string {
    const reason = HttpStatus[status];

    if (!reason) {
      return 'Error';
    }

    return reason
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getDefaultCode(status: HttpStatus): string {
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }
}
