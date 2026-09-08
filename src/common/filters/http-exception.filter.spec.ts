import { ArgumentsHost, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function createHost(exceptionPath = '/api/v1/resource') {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }) as unknown as Response,
        getRequest: () => ({ url: exceptionPath }) as Request,
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  it('keeps the HTTP status and normalizes a validation response', () => {
    const { host, status, json } = createHost('/api/v1/users');

    filter.catch(
      new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: ['email must be an email'],
        error: 'Bad Request',
        path: '/api/v1/users',
      }),
    );
  });

  it('does not expose internal messages for unexpected errors', () => {
    const { host, status, json } = createHost();

    filter.catch(new InternalServerErrorException('database credentials leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error.',
      }),
    );
    expect(json.mock.calls[0][0].message).not.toContain('database credentials');
  });
});
