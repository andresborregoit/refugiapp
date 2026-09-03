import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/common/enums/user-role.enum';
import { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/application/services/users.service';
import { User } from '../src/modules/users/domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../src/modules/users/domain/repositories/user.repository';
import { UsersController } from '../src/modules/users/interfaces/controllers/users.controller';

class InMemoryUserRepository implements UserRepository {
  public users: User[] = [];
  public passwordHashes: string[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(input: Parameters<UserRepository['create']>[0]): Promise<User> {
    this.passwordHashes.push(input.passwordHash);
    const user = new User(
      'e126e806-828c-44ac-a455-2cfdc2454db9',
      input.email,
      input.firstName,
      input.lastName,
      input.roles,
      input.isActive,
    );

    this.users.push(user);

    return user;
  }

  async activate(_id: string): Promise<void> {}

  async softDelete(_id: string): Promise<void> {}
}

describe('admin users (e2e)', () => {
  let app: INestApplication;
  let repository: InMemoryUserRepository;
  let authenticatedUser: AuthenticatedUser;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    authenticatedUser = {
      id: 'bbd920ad-6b16-4f40-b3ab-509d1324687d',
      email: 'admin@refugiapp.local',
      roles: [UserRole.ADMIN],
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        RolesGuard,
        {
          provide: USER_REPOSITORY,
          useValue: repository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
          request.user = authenticatedUser;

          return true;
        },
      })
      .compile();

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
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows admins to create users without exposing passwordHash', () => {
    return request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: '  MANAGER@Refugiapp.Local ',
        password: 'plain-password',
        firstName: 'Shelter',
        lastName: 'Manager',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 'e126e806-828c-44ac-a455-2cfdc2454db9',
          email: 'manager@refugiapp.local',
          firstName: 'Shelter',
          lastName: 'Manager',
          roles: [UserRole.SHELTER_MANAGER],
          isActive: true,
        });
        expect(body).not.toHaveProperty('passwordHash');
        expect(repository.passwordHashes[0]).not.toBe('plain-password');
      });
  });

  it('rejects non-admin users', () => {
    authenticatedUser = {
      id: '36fa770c-0e96-4c20-8766-c239486763d2',
      email: 'manager@refugiapp.local',
      roles: [UserRole.SHELTER_MANAGER],
    };

    return request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'new@refugiapp.local',
        password: 'plain-password',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(403);
  });

  it('returns 409 when email already exists', () => {
    repository.users.push(
      new User(
        'b1ac6d88-566c-4e44-a765-e0e2343e0122',
        'manager@refugiapp.local',
        'Shelter',
        'Manager',
        [UserRole.SHELTER_MANAGER],
        true,
      ),
    );

    return request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: ' MANAGER@refugiapp.local ',
        password: 'plain-password',
        firstName: 'Other',
        lastName: 'User',
      })
      .expect(409);
  });

  it('rejects invalid roles at DTO validation', () => {
    return request(app.getHttpServer())
      .post('/api/v1/users')
      .send({
        email: 'new@refugiapp.local',
        password: 'plain-password',
        firstName: 'New',
        lastName: 'User',
        roles: ['owner'],
      })
      .expect(400);
  });
});
