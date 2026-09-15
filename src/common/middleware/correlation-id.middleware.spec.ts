import { Request, Response } from 'express';
import {
  CORRELATION_ID_HEADER,
  correlationIdMiddleware,
} from './correlation-id.middleware';
import { requestContextStorage } from '../storage/request-context';

describe('correlationIdMiddleware', () => {
  function createMocks(headerValue?: string) {
    const setHeader = jest.fn();
    const header = jest.fn().mockReturnValue(headerValue);
    const request = { header } as unknown as Request;
    const response = { setHeader } as unknown as Response;
    const next = jest.fn();

    return { request, response, next, setHeader, header };
  }

  it('reuses an incoming x-request-id when present', () => {
    const { request, response, next, setHeader } = createMocks('incoming-id');

    correlationIdMiddleware(request, response, next);

    expect(setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'incoming-id');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a UUID when no header is provided', () => {
    const { request, response, next, setHeader } = createMocks();

    correlationIdMiddleware(request, response, next);

    expect(setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('exposes the request id through the async context during the request', () => {
    const { request, response, next } = createMocks('ctx-id');
    let observedId: string | undefined;

    next.mockImplementation((callback: () => void) => {
      observedId = requestContextStorage.getStore()?.requestId;
      callback?.();
    });

    correlationIdMiddleware(request, response, next);

    expect(observedId).toBe('ctx-id');
  });
});