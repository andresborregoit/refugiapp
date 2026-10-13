import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AnimalsService } from '../../application/services/animals.service';
import { AnimalsController } from '../controllers/animals.controller';

interface JsonSchema {
  type?: string;
  format?: string;
  example?: unknown;
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
}

const ERROR_SCHEMA_REF = '#/components/schemas/ErrorResponseDto';

describe('Animals Swagger contract', () => {
  let document: SwaggerDocument;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AnimalsController],
      providers: [
        {
          provide: AnimalsService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            changeStatus: jest.fn(),
            deleteAnimal: jest.fn(),
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

  function operationOf(method: string, path: string): SwaggerOperation {
    const operation = document.paths?.[path]?.[method];
    expect(operation).toBeDefined();
    return operation as SwaggerOperation;
  }

  describe('DELETE /animals/{id}', () => {
    const operation = () => operationOf('delete', '/animals/{id}');

    it('documents a 204 response', () => {
      expect(operation().responses?.['204']).toBeDefined();
    });

    it('documents 401/403/404/409/429 with the error schema', () => {
      for (const status of ['401', '403', '404', '409', '429']) {
        expect(operation().responses?.[status]?.content?.['application/json']?.schema?.$ref).toBe(
          ERROR_SCHEMA_REF,
        );
      }
    });

    it('documents the integrity conflict codes', () => {
      const description = operation().responses?.['409']?.description ?? '';

      expect(description).toContain('ANIMAL_UNDER_TREATMENT');
      expect(description).toContain('ANIMAL_HAS_PENDING_TASKS');
      expect(description).toContain('ANIMAL_HAS_HISTORY');
    });

    it('documents the id path parameter as a uuid', () => {
      expect(operation().parameters?.[0]?.schema?.format).toBe('uuid');
    });
  });
});
