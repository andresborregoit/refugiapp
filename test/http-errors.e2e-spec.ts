import {
  Controller,
  ForbiddenException,
  INestApplication,
  Query,
  UnauthorizedException,
  Get,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { IsEmail } from 'class-validator';
import request from 'supertest';
import { Test } from '@nestjs/testing';
import { ResourceConflictException } from '../src/common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../src/common/exceptions/resource-not-found.exception';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

class InvalidRequestDto {
  @IsEmail()
  email!: string;
}

@Controller('errors')
class ErrorTestController {
  @Get('validation')
  validation(@Query() _query: InvalidRequestDto): void {
    return;
  }

  @Get('unauthorized')
  unauthorized(): never {
    throw new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    });
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenException('Access denied.');
  }

  @Get('not-found')
  notFound(): never {
    throw new ResourceNotFoundException('Animal', 'missing-id');
  }

  @Get('conflict')
  conflict(): never {
    throw new ResourceConflictException('User already exists.');
  }
}

@Module({ controllers: [ErrorTestController] })
class ErrorTestModule {}

describe('HTTP error responses (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ErrorTestModule] }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a uniform 400 response', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/errors/validation')
      .query({ email: 'invalid' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST' }),
    );
  });

  it.each([
    ['/unauthorized', 401, 'INVALID_CREDENTIALS'],
    ['/forbidden', 403, 'FORBIDDEN'],
    ['/not-found', 404, 'RESOURCE_NOT_FOUND'],
    ['/conflict', 409, 'RESOURCE_CONFLICT'],
  ])('returns status %s with code %s', async (path, status, code) => {
    const response = await request(app.getHttpServer()).get(`/api/v1/errors${path}`);

    expect(response.status).toBe(status);
    expect(response.body).toEqual(expect.objectContaining({ statusCode: status, code }));
  });
});
