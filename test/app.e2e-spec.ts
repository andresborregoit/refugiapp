import {
  Body,
  Controller,
  ForbiddenException,
  INestApplication,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Roles } from '../src/common/decorators/roles.decorator';
import { UserRole } from '../src/common/enums/user-role.enum';
import { ResourceConflictException } from '../src/common/exceptions/resource-conflict.exception';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AuthService } from '../src/modules/auth/application/services/auth.service';
import { AuthController } from '../src/modules/auth/interfaces/controllers/auth.controller';
import { LoginDto } from '../src/modules/auth/interfaces/dto/login.dto';

@Controller('test-errors')
class TestErrorsController {
  @Post('validation')
  validateLogin(@Body() dto: LoginDto): LoginDto {
    return dto;
  }

  @Post('conflict')
  conflict(): void {
    throw new ResourceConflictException('Email is already registered.', 'EMAIL_ALREADY_EXISTS');
  }

  @Post('forbidden')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  forbidden(): void {
    throw new ForbiddenException();
  }
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, AuthController, TestErrorsController],
      providers: [
        AppService,
        AuthService,
        RolesGuard,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect({
        name: 'refugiapp-api',
        status: 'ok',
        version: '0.1.0',
      });
  });

  it('returns a normalized 400 response for validation errors', () => {
    return request(app.getHttpServer())
      .post('/api/v1/test-errors/validation')
      .send({ email: 'invalid', password: 'short', extra: true })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 400,
            code: 'BAD_REQUEST',
            message: 'Bad Request',
            path: '/api/v1/test-errors/validation',
          }),
        );
        expect(body.details).toEqual(
          expect.arrayContaining([
            'property extra should not exist',
            'email must be an email',
            'password must be longer than or equal to 8 characters',
          ]),
        );
      });
  });

  it('returns a normalized 401 response without revealing account existence', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@refugiapp.local', password: 'valid-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 401,
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
            path: '/api/v1/auth/login',
          }),
        );
        expect(JSON.stringify(body).toLowerCase()).not.toContain('user');
        expect(JSON.stringify(body).toLowerCase()).not.toContain('exists');
      });
  });

  it('returns a normalized 403 response when roles are insufficient', () => {
    return request(app.getHttpServer())
      .post('/api/v1/test-errors/forbidden')
      .expect(403)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 403,
            code: 'FORBIDDEN',
            message: 'Forbidden resource',
            path: '/api/v1/test-errors/forbidden',
          }),
        );
      });
  });

  it('returns a normalized 404 response for missing routes', () => {
    return request(app.getHttpServer())
      .get('/api/v1/not-found')
      .expect(404)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 404,
            code: 'NOT_FOUND',
            message: 'Cannot GET /api/v1/not-found',
            path: '/api/v1/not-found',
          }),
        );
      });
  });

  it('returns a normalized 409 response for resource conflicts', () => {
    return request(app.getHttpServer())
      .post('/api/v1/test-errors/conflict')
      .expect(409)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            statusCode: 409,
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email is already registered.',
            path: '/api/v1/test-errors/conflict',
          }),
        );
      });
  });
});
