import { ConsoleLogger, ConsoleLoggerOptions, LogLevel } from '@nestjs/common';
import { sanitizeLogValue } from './log-sanitizer';
import { getRequestId } from '../storage/request-context';

export class JsonLoggerService extends ConsoleLogger {
  constructor(context?: string, options: ConsoleLoggerOptions = {}) {
    super(context ?? '', {
      ...options,
      json: true,
      colors: false,
    });
  }

  protected override getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ): {
    level: LogLevel;
    pid: number;
    timestamp: number;
    message: unknown;
    context?: string;
    stack?: unknown;
    requestId?: string;
  } {
    const logObject = super.getJsonLogObject(message, options);
    const requestId = getRequestId();

    return {
      ...logObject,
      ...(requestId ? { requestId } : {}),
      message: sanitizeLogValue(logObject.message),
    };
  }
}