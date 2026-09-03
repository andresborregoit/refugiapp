import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(url = '/api/v1/test') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('formats validation errors with a stable details field', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
        statusCode: HttpStatus.BAD_REQUEST,
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'BAD_REQUEST',
        message: 'Bad Request',
        details: ['email must be an email'],
        path: '/api/v1/test',
      }),
    );
  });

  it.each([
    [new UnauthorizedException('Unauthorized'), HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED'],
    [new ForbiddenException('Forbidden'), HttpStatus.FORBIDDEN, 'FORBIDDEN'],
    [new ConflictException('Conflict'), HttpStatus.CONFLICT, 'CONFLICT'],
  ])('preserves HTTP status and safe message for %s', (exception, expectedStatus, expectedCode) => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: expectedStatus,
        code: expectedCode,
        message: exception.message,
      }),
    );
  });

  it('does not expose unexpected internal error messages', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createHost();

    filter.catch(new Error('database password leaked in stack'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      }),
    );
  });
});
