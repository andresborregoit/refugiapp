import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VeterinariansService } from '../../application/services/veterinarians.service';
import { VeterinariansController } from '../controllers/veterinarians.controller';

interface JsonSchema {
  type?: string;
  format?: string;
  example?: unknown;
  enum?: string[];
  writeOnly?: boolean;
  nullable?: boolean;
  minLength?: number;
  oneOf?: unknown[];
  items?: { type?: string; enum?: string[] };
  $ref?: string;
  allOf?: { $ref?: string }[];
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
const USER_SCHEMA_REF = '#/components/schemas/UserResponseDto';

describe('Veterinarians Swagger contract', () => {
  let document: SwaggerDocument;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VeterinariansController],
      providers: [
        {
          provide: VeterinariansService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
            reactivate: jest.fn(),
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

  describe('CreateVeterinarianDto schema', () => {
    it('documents userId as optional and mutually exclusive with createUser', () => {
      expect(propertyOf('CreateVeterinarianDto', 'userId').nullable).toBe(true);
      expect(propertyOf('CreateVeterinarianDto', 'userId').format).toBe('uuid');
    });

    it('documents the nested createUser object', () => {
      const createUser = propertyOf('CreateVeterinarianDto', 'createUser');
      expect(createUser.allOf?.[0]?.$ref).toBe('#/components/schemas/CreateVeterinarianUserDto');
    });

    it('does not expose any sensitive field on the payload', () => {
      const properties = schemaOf('CreateVeterinarianDto').properties as Record<string, JsonSchema>;
      expect(properties).not.toHaveProperty('passwordHash');
    });
  });

  describe('CreateVeterinarianUserDto schema', () => {
    it('documents password as writeOnly with password format', () => {
      const password = propertyOf('CreateVeterinarianUserDto', 'password');
      expect(password.format).toBe('password');
      expect(password.writeOnly).toBe(true);
      expect(password.minLength).toBe(12);
    });

    it('documents email, firstName and lastName as optional', () => {
      expect(propertyOf('CreateVeterinarianUserDto', 'email').format).toBe('email');
      expect(propertyOf('CreateVeterinarianUserDto', 'firstName').example).toBe('Sofia');
      expect(propertyOf('CreateVeterinarianUserDto', 'lastName').example).toBe('Martinez');
    });
  });

  describe('VeterinarianResponseDto schema', () => {
    it('documents the linked user without exposing passwordHash', () => {
      const user = propertyOf('VeterinarianResponseDto', 'user');
      expect(user.nullable).toBe(true);
      expect(user.allOf?.[0]?.$ref).toBe(USER_SCHEMA_REF);
      expect(schemaOf('VeterinarianResponseDto').properties).not.toHaveProperty('passwordHash');
    });

    it('documents professional fields', () => {
      for (const field of ['firstName', 'lastName', 'licenseNumber']) {
        expect(propertyOf('VeterinarianResponseDto', field).type).toBe('string');
      }
      expect(propertyOf('VeterinarianResponseDto', 'isActive').type).toBe('boolean');
    });
  });

  describe('Error responses', () => {
    it('documents 400/401/403/404/409/429 on POST /veterinarians with the error schema', () => {
      const operation = operationOf('post', '/veterinarians');

      for (const status of ['400', '401', '403', '404', '409', '429']) {
        const response = operation.responses?.[status];
        expect(response).toBeDefined();
        expect(response?.content?.['application/json']?.schema?.$ref).toBe(ERROR_SCHEMA_REF);
      }
    });

    it('documents conflict codes on POST /veterinarians', () => {
      const conflict = operationOf('post', '/veterinarians').responses?.['409'];
      expect(conflict?.description).toContain('License number, email or user already linked.');
    });

    it('documents 400/401/403 on GET /veterinarians', () => {
      const operation = operationOf('get', '/veterinarians');
      for (const status of ['400', '401', '403']) {
        expect(operation.responses?.[status]?.content?.['application/json']?.schema?.$ref).toBe(
          ERROR_SCHEMA_REF,
        );
      }
    });
  });

  describe('POST /veterinarians/{id}/reactivate', () => {
    const operation = () => operationOf('post', '/veterinarians/{id}/reactivate');

    it('documents a 200 response with the VeterinarianResponseDto schema', () => {
      const response = operation().responses?.['200'];
      expect(response).toBeDefined();
      expect(response?.content?.['application/json']?.schema?.$ref).toBe(
        '#/components/schemas/VeterinarianResponseDto',
      );
    });

    it('documents 401/403/404/409/429 with the error schema', () => {
      for (const status of ['401', '403', '404', '409', '429']) {
        expect(operation().responses?.[status]?.content?.['application/json']?.schema?.$ref).toBe(
          ERROR_SCHEMA_REF,
        );
      }
    });

    it('documents the conflict for an already active veterinarian', () => {
      expect(operation().responses?.['409']?.description).toContain('already active');
    });

    it('documents the id path parameter as a uuid', () => {
      expect(operation().parameters?.[0]?.schema?.format).toBe('uuid');
    });
  });
});