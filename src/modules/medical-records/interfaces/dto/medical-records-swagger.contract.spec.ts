import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MedicalRecordsService } from '../../application/services/medical-records.service';
import { MedicalRecordsController } from '../controllers/medical-records.controller';

describe('MedicalRecords Swagger contract', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MedicalRecordsController],
      providers: [
        {
          provide: MedicalRecordsService,
          useValue: {
            create: jest.fn(),
            list: jest.fn(),
            findById: jest.fn(),
            listChanges: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  function getSchema(name: string) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    return document.components?.schemas?.[name] as
      | { properties?: Record<string, unknown> }
      | undefined;
  }

  it('documents the paginated change history response with pagination metadata', async () => {
    const schema = getSchema('PaginatedMedicalRecordChangesResponseDto');

    expect(schema).toBeDefined();

    const { items, page, limit, total } = schema?.properties ?? {};

    expect(items).toMatchObject({ type: 'array', items: { $ref: '#/components/schemas/MedicalRecordChangeResponseDto' } });
    expect(page).toMatchObject({ type: 'number' });
    expect(limit).toMatchObject({ type: 'number' });
    expect(total).toMatchObject({ type: 'number' });
  });

  it('documents each change with changedFields, previousValues, actor, type and timestamp', async () => {
    const schema = getSchema('MedicalRecordChangeResponseDto');

    expect(schema).toBeDefined();

    const properties = schema?.properties ?? {};
    const changedFields = properties.changedFields as { type?: string; items?: { type?: string } } | undefined;
    const changedByUserId = properties.changedByUserId as { nullable?: boolean; format?: string } | undefined;
    const previousValues = properties.previousValues as { type?: string } | undefined;
    const changeType = properties.changeType as { enum?: string[] } | undefined;
    const changedAt = properties.changedAt as { type?: string; format?: string } | undefined;
    const changedBy = properties.changedBy as { nullable?: boolean } | undefined;

    expect(changedFields).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(changedByUserId).toMatchObject({ nullable: true, format: 'uuid' });
    expect(previousValues).toMatchObject({ type: 'object' });
    expect(changeType?.enum).toEqual(['update', 'soft_delete', 'restore']);
    expect(changedAt).toMatchObject({ type: 'string', format: 'date-time' });
    expect(changedBy).toBeDefined();
    expect(changedBy).toMatchObject({ nullable: true });
  });
});