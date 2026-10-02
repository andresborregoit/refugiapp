import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { UsersService } from '../../application/services/users.service';
import { UsersController } from '../controllers/users.controller';

interface JsonSchema {
  type?: string;
  format?: string;
  example?: unknown;
  enum?: string[];
  writeOnly?: boolean;
  required?: string[];
  oneOf?: unknown[];
  items?: { type?: string; enum?: string[] };
  properties?: Record<string, JsonSchema>;
}

interface SwaggerOperation {
  responses?: Record<
    string,
    {
      description?: string;
      content?: {
        'application/json'?: {
          schema?: { $ref?: string };
        };
      };
    }
  >;
  parameters?: { name?: string; schema?: JsonSchema }[];
}

interface SwaggerDocument {
  paths?: Record<string, Record<string, SwaggerOperation>>;
  components?: {
    schemas?: Record<string, JsonSchema>;
  };
}

const ERROR_SCHEMA_REF = '#/components/schemas/ErrorResponseDto';

const USER_PATHS: Record<string, Record<string, string[]>> = {
  '/users': {
    post: ['400', '401', '403', '409', '429'],
    get: ['400', '401', '403', '429'],
  },
  '/users/{id}': {
    patch: ['400', '401', '403', '404', '409', '429'],
  },
  '/users/me': {
    get: ['401', '403', '404', '429'],
  },
  '/users/{id}/deactivate': {
    post: ['401', '403', '404', '429'],
  },
  '/users/{id}/activate': {
    post: ['401', '403', '404', '429'],
  },
};

describe('Users Swagger contract', () => {
  let document: SwaggerDocument;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            createUser: jest.fn(),
            listUsers: jest.fn(),
            updateUser: jest.fn(),
            deactivateUser: jest.fn(),
            activateUser: jest.fn(),
            getProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    await app.init();

    document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    ) as unknown as SwaggerDocument;

    await app.close();
  });

  function schemaOf(dto: string): JsonSchema {
    const schema = document.components?.schemas?.[dto];
    expect(schema).toBeDefined();
    return schema as JsonSchema;
  }

  function propertyOf(dto: string, property: string): JsonSchema {
    const propertySchema = schemaOf(dto).properties?.[property];
    expect(propertySchema).toBeDefined();
    return propertySchema as JsonSchema;
  }

  function operationOf(method: string, path: string): SwaggerOperation {
    const operation = document.paths?.[path]?.[method];
    expect(operation).toBeDefined();
    return operation as SwaggerOperation;
  }

  describe('UserResponseDto schema', () => {
    it('documents every field with a type and an example', () => {
      const fields = [
        'id',
        'email',
        'firstName',
        'lastName',
        'roles',
        'isActive',
        'createdAt',
        'updatedAt',
      ];

      for (const field of fields) {
        const property = propertyOf('UserResponseDto', field);
        expect(property.type).toBeDefined();
        expect(property.example).toBeDefined();
      }
    });

    it('documents id as a uuid', () => {
      const id = propertyOf('UserResponseDto', 'id');
      expect(id.format).toBe('uuid');
      expect(id.example).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('documents email with email format', () => {
      expect(propertyOf('UserResponseDto', 'email').format).toBe('email');
    });

    it('documents roles with the UserRole enum and an example', () => {
      const roles = propertyOf('UserResponseDto', 'roles');
      expect(roles.items?.enum).toEqual([
        UserRole.ADMIN,
        UserRole.SHELTER_MANAGER,
        UserRole.VETERINARIAN,
      ]);
      expect(roles.example).toEqual([UserRole.SHELTER_MANAGER]);
    });

    it('documents createdAt and updatedAt as date-time', () => {
      expect(propertyOf('UserResponseDto', 'createdAt').format).toBe('date-time');
      expect(propertyOf('UserResponseDto', 'updatedAt').format).toBe('date-time');
    });

    it('does not expose passwordHash', () => {
      expect(schemaOf('UserResponseDto').properties).not.toHaveProperty('passwordHash');
    });

    it('does not expose pagination fields (page, limit, total, items) on the item DTO', () => {
      const properties = schemaOf('UserResponseDto').properties as Record<string, JsonSchema>;
      for (const paginationField of ['page', 'limit', 'total', 'items']) {
        expect(properties).not.toHaveProperty(paginationField);
      }
    });
  });

  describe('GET /users', () => {
    it('documents pagination parameters and the paginated response', () => {
      const operation = operationOf('get', '/users');
      const parameters = operation.parameters ?? [];

      expect(parameters.find((parameter) => parameter.name === 'page')?.schema).toMatchObject({
        type: 'number',
        minimum: 1,
        default: 1,
      });
      expect(parameters.find((parameter) => parameter.name === 'limit')?.schema).toMatchObject({
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 20,
      });
      expect(operation.responses?.['200']?.content?.['application/json']?.schema?.$ref).toBe(
        '#/components/schemas/PaginatedUsersResponseDto',
      );
    });
  });

  describe('CreateUserDto schema', () => {
    it('documents firstName and lastName with examples', () => {
      expect(propertyOf('CreateUserDto', 'firstName').example).toBe('Sofia');
      expect(propertyOf('CreateUserDto', 'lastName').example).toBe('Ramirez');
    });

    it('documents password as writeOnly with password format', () => {
      const password = propertyOf('CreateUserDto', 'password');
      expect(password.format).toBe('password');
      expect(password.writeOnly).toBe(true);
    });
  });

  describe('UpdateUserDto schema', () => {
    it('declares every field as optional', () => {
      const required = schemaOf('UpdateUserDto').required ?? [];
      expect(required).toEqual([]);
    });

    it('documents roles with the UserRole enum', () => {
      const roles = propertyOf('UpdateUserDto', 'roles');
      expect(roles.items?.enum).toEqual([
        UserRole.ADMIN,
        UserRole.SHELTER_MANAGER,
        UserRole.VETERINARIAN,
      ]);
    });

    it('never exposes passwordHash', () => {
      expect(schemaOf('UpdateUserDto').properties).not.toHaveProperty('passwordHash');
    });
  });

  describe('PATCH /users/{id}', () => {
    it('documents the partial update response', () => {
      const operation = operationOf('patch', '/users/{id}');
      expect(operation.responses?.['200']?.content?.['application/json']?.schema?.$ref).toBe(
        '#/components/schemas/UserResponseDto',
      );
    });

    it('documents 409 for email conflicts and last admin protection', () => {
      const operation = operationOf('patch', '/users/{id}');
      const conflict = operation.responses?.['409'];
      expect(conflict?.description).toContain('last admin');
      expect(conflict?.content?.['application/json']?.schema?.$ref).toBe(ERROR_SCHEMA_REF);
    });
  });

  describe('Error responses', () => {
    for (const [path, methods] of Object.entries(USER_PATHS)) {
      for (const [method, expectedStatuses] of Object.entries(methods)) {
        it(`${method.toUpperCase()} ${path} documents error responses with ErrorResponseDto`, () => {
          const operation = operationOf(method, path);

          for (const status of expectedStatuses) {
            const response = operation.responses?.[status];
            expect(response).toBeDefined();
            const schemaRef =
              response?.content?.['application/json']?.schema?.$ref;
            expect(schemaRef).toBe(ERROR_SCHEMA_REF);
          }
        });
      }
    }

    it('POST /users documents 409 EMAIL_ALREADY_EXISTS with the error schema', () => {
      const operation = operationOf('post', '/users');
      const conflict = operation.responses?.['409'];
      expect(conflict?.description).toContain('Email already registered.');
      expect(conflict?.content?.['application/json']?.schema?.$ref).toBe(ERROR_SCHEMA_REF);
    });

    it('documents the 429 rate limit error on every operation', () => {
      for (const [path, methods] of Object.entries(USER_PATHS)) {
        for (const method of Object.keys(methods)) {
          const response = operationOf(method, path).responses?.['429'];
          expect(response).toBeDefined();
          expect(response?.content?.['application/json']?.schema?.$ref).toBe(ERROR_SCHEMA_REF);
        }
      }
    });
  });

  describe('Path parameters', () => {
    it('documents the id path param as a uuid for update, deactivate and activate', () => {
      for (const path of ['/users/{id}', '/users/{id}/deactivate', '/users/{id}/activate']) {
        const method = path === '/users/{id}' ? 'patch' : 'post';
        const parameters = operationOf(method, path).parameters ?? [];
        const idParam = parameters.find((parameter) => parameter.name === 'id');
        expect(idParam).toBeDefined();
        expect(idParam?.schema?.format).toBe('uuid');
      }
    });
  });

  describe('ErrorResponseDto schema', () => {
    it('documents message as string or array of strings instead of a generic object', () => {
      const message = propertyOf('ErrorResponseDto', 'message');
      expect(message.oneOf).toBeDefined();
    });
  });
});
