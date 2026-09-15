import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { requestContextStorage } from '../storage/request-context';

export const CORRELATION_ID_HEADER = 'x-request-id';

export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header(CORRELATION_ID_HEADER);
  const requestId =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim()
      : randomUUID();

  response.setHeader(CORRELATION_ID_HEADER, requestId);

  requestContextStorage.run({ requestId }, () => next());
}