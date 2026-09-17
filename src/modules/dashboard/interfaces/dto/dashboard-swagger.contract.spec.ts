import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DashboardService } from '../../application/services/dashboard.service';
import { DashboardController } from '../controllers/dashboard.controller';

describe('Dashboard Swagger contract', () => {
  it('documents profilePhotoMediaId as a nullable uuid field with an example', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: { getOverview: jest.fn() } }],
    }).compile();

    const app: INestApplication = moduleRef.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );

    const schema = document.components?.schemas?.DashboardAnimalDto as
      | { properties?: Record<string, unknown> }
      | undefined;

    expect(schema).toBeDefined();

    const property = schema?.properties?.profilePhotoMediaId as
      | { nullable?: boolean; format?: string; example?: string }
      | undefined;

    expect(property).toBeDefined();
    expect(property?.nullable).toBe(true);
    expect(property?.format).toBe('uuid');
    expect(property?.example).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    await app.close();
  });
});