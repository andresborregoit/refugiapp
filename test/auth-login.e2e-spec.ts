import { Controller, Get, INestApplication, UseGuards, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CurrentUser } from '../src/common/decorators/current-user.decorator';
import { UserRole } from '../src/common/enums/user-role.enum';
import { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { hashPassword } from '../src/common/security/password-hasher';
import { AuthService } from '../src/modules/auth/application/services/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { JwtStrategy } from '../src/modules/auth/infrastructure/strategies/jwt.strategy';
import { AuthController } from '../src/modules/auth/interfaces/controllers/auth.controller';
import { UsersService } from '../src/modules/users/application/services/users.service';
import { UserCredentials } from '../src/modules/users/domain/entities/user-credentials.entity';

const jwtSecret = 'test-secret-with-at-least-thirty-two-characters';
const jwtIssuer = 'refugiapp-api-test';
const jwtAudience = 'refugiapp-mobile-test';
const jwtExpiresIn = '1h';

@Controller('test-auth')
class TestAuthController {
  @Get('protected')
  @UseGuards(JwtAuthGuard)
  protected(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}

describe('Auth login (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let activeUser: UserCredentials;
  let inactiveUser: UserCredentials;
  const usersService = {
    findCredentialsByEmail: jest.fn(),
  };

  beforeAll(async () => {
    activeUser = new UserCredentials(
      '8effc5d9-284a-465c-8a96-2dd4907f7815',
      'admin@refugiapp.local',
      await hashPassword('correct-password'),
      [UserRole.ADMIN],
      true,
    );
    inactiveUser = new UserCredentials(
      'bbddce49-1a92-4eef-a9f2-f6b368cbfb2f',
      'inactive@refugiapp.local',
      await hashPassword('correct-password'),
      [UserRole.SHELTER_MANAGER],
      false,
    );

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: jwtSecret,
          signOptions: {
            expiresIn: jwtExpiresIn,
            issuer: jwtIssuer,
            audience: jwtAudience,
          },
        }),
      ],
      controllers: [AuthController, TestAuthController],
      providers: [
        AuthService,
        JwtStrategy,
        JwtAuthGuard,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const values: Record<string, string> = {
                'jwt.secret': jwtSecret,
                'jwt.expiresIn': jwtExpiresIn,
                'jwt.issuer': jwtIssuer,
                'jwt.audience': jwtAudience,
              };

              return values[key] ?? fallback;
            }),
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'jwt.secret': jwtSecret,
              };

              const value = values[key];

              if (!value) {
                throw new Error(`${key} is required.`);
              }

              return value;
            }),
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
      }),
    );
    await app.init();
    jwtService = app.get(JwtService);
  });

  beforeEach(() => {
    usersService.findCredentialsByEmail.mockImplementation((email: string) => {
      const users = new Map([
        [activeUser.email, activeUser],
        [inactiveUser.email, inactiveUser],
      ]);

      return Promise.resolve(users.get(email) ?? null);
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs in with valid credentials and returns only token metadata', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ADMIN@refugiapp.local', password: 'correct-password' })
      .expect(200)
      .expect(({ body }) => {
        expect(Object.keys(body).sort()).toEqual(['accessToken', 'expiresIn', 'tokenType']);
        expect(body.tokenType).toBe('Bearer');
        expect(body.expiresIn).toBe(jwtExpiresIn);

        const payload = jwtService.verify(body.accessToken, {
          secret: jwtSecret,
          issuer: jwtIssuer,
          audience: jwtAudience,
        });

        expect(payload).toEqual(
          expect.objectContaining({
            sub: activeUser.id,
            email: activeUser.email,
            roles: activeUser.roles,
            iss: jwtIssuer,
            aud: jwtAudience,
          }),
        );
        expect(payload.exp).toEqual(expect.any(Number));
        expect(body).not.toHaveProperty('passwordHash');
      });
  });

  it('validates the login DTO', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email', password: 'short', extra: true })
      .expect(400);
  });

  it('rejects invalid passwords with a generic 401 error', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: activeUser.email, password: 'incorrect-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid email or password.');
      });
  });

  it('rejects missing users with a generic 401 error', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@refugiapp.local', password: 'correct-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid email or password.');
      });
  });

  it('rejects inactive users with a generic 401 error', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: inactiveUser.email, password: 'correct-password' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Invalid email or password.');
      });
  });

  it('rejects invalid bearer tokens', () => {
    return request(app.getHttpServer())
      .get('/api/v1/test-auth/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });
});
