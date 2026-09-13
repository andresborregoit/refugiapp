import {
  ExecutionContext,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { ExpensesService } from '../src/modules/expenses/application/services/expenses.service';
import { Expense } from '../src/modules/expenses/domain/entities/expense.entity';
import { ExpenseCategory } from '../src/modules/expenses/domain/enums/expense-category.enum';
import { AnimalExpensesController } from '../src/modules/expenses/interfaces/controllers/animal-expenses.controller';
import { ExpensesController } from '../src/modules/expenses/interfaces/controllers/expenses.controller';

const adminPayload = { id: 'admin-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] };
const managerPayload = {
  id: 'manager-id',
  email: 'manager@refugiapp.local',
  roles: [UserRole.SHELTER_MANAGER],
};
const veterinarianPayload = {
  id: 'veterinarian-user-id',
  email: 'veterinarian@refugiapp.local',
  roles: [UserRole.VETERINARIAN],
};

describe('Expenses (e2e)', () => {
  let app: INestApplication;
  const expensesService = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    listByAnimal: jest.fn(),
    softDelete: jest.fn(),
  };

  class AdminJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = adminPayload;
      return true;
    }
  }

  class ManagerJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = managerPayload;
      return true;
    }
  }

  class VeterinarianJwtAuthGuard {
    canActivate(context: ExecutionContext): boolean {
      context.switchToHttp().getRequest().user = veterinarianPayload;
      return true;
    }
  }

  class NoTokenJwtAuthGuard {
    canActivate(): boolean {
      throw new UnauthorizedException();
    }
  }

  async function createAppWithGuard(
    guard: new () => { canActivate(context: ExecutionContext): boolean },
  ): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
      controllers: [ExpensesController, AnimalExpensesController],
      providers: [{ provide: ExpensesService, useValue: expensesService }, RolesGuard],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(guard)
      .compile();

    const testApp = moduleRef.createNestApplication();
    testApp.setGlobalPrefix('api/v1');
    testApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    testApp.useGlobalFilters(new HttpExceptionFilter());
    await testApp.init();

    return testApp;
  }

  beforeAll(async () => {
    app = await createAppWithGuard(AdminJwtAuthGuard);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/expenses', () => {
    const validDto = {
      animalId: '11111111-1111-4111-8111-111111111111',
      category: ExpenseCategory.MEDICINE,
      amountCents: 1250,
      currency: 'ARS',
      description: 'Antibiotics',
      incurredAt: '2026-03-10T10:00:00.000Z',
    };

    it('creates an expense when called by an admin', async () => {
      expensesService.create.mockResolvedValue(createExpense());

      const res = await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(201);

      expect(res.body).toMatchObject({
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
      });
      expect(expensesService.create).toHaveBeenCalledWith(
        expect.objectContaining(validDto),
        adminPayload.id,
      );
    });

    it('creates an expense when called by a shelter_manager', async () => {
      const managerApp = await createAppWithGuard(ManagerJwtAuthGuard);
      expensesService.create.mockResolvedValue(createExpense());

      await request(managerApp.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer manager-token')
        .send(validDto)
        .expect(201);

      expect(expensesService.create).toHaveBeenCalledWith(
        expect.objectContaining(validDto),
        managerPayload.id,
      );

      await managerApp.close();
    });

    it('returns 403 when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(vetApp.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer vet-token')
        .send(validDto)
        .expect(403);

      expect(expensesService.create).not.toHaveBeenCalled();

      await vetApp.close();
    });

    it('returns 401 when no token is provided', async () => {
      const noTokenApp = await createAppWithGuard(NoTokenJwtAuthGuard);

      await request(noTokenApp.getHttpServer())
        .post('/api/v1/expenses')
        .send(validDto)
        .expect(401);

      expect(expensesService.create).not.toHaveBeenCalled();

      await noTokenApp.close();
    });

    it('returns 400 when amountCents is negative', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, amountCents: -1 })
        .expect(400);

      expect(expensesService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when currency has more than 3 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, currency: 'ARGENTINA' })
        .expect(400);

      expect(expensesService.create).not.toHaveBeenCalled();
    });

    it('returns 400 when animalId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send({ ...validDto, animalId: 'not-a-uuid' })
        .expect(400);

      expect(expensesService.create).not.toHaveBeenCalled();
    });

    it('returns 404 when the animal does not exist', async () => {
      expensesService.create.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Animal with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send(validDto)
        .expect(404);
    });

    it('returns 404 when the ticket media asset does not exist', async () => {
      expensesService.create.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'MediaAsset with id missing-media was not found.',
        }),
      );

      await request(app.getHttpServer())
        .post('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validDto,
          ticketMediaId: '33333333-3333-4333-8333-333333333333',
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/expenses', () => {
    it('lists expenses when called by an admin', async () => {
      expensesService.list.mockResolvedValue({
        items: [createExpense()],
        page: 1,
        limit: 20,
        total: 1,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .query({
          category: ExpenseCategory.MEDICINE,
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-31T23:59:59.000Z',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        items: [
          {
            id: 'expense-id',
            animalId: 'animal-id',
            category: ExpenseCategory.MEDICINE,
          },
        ],
      });
      expect(expensesService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ExpenseCategory.MEDICINE,
          from: '2026-03-01T00:00:00.000Z',
          to: '2026-03-31T23:59:59.000Z',
        }),
      );
    });

    it('lists expenses when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);
      expensesService.list.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await request(vetApp.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', 'Bearer vet-token')
        .expect(200);

      expect(expensesService.list).toHaveBeenCalled();

      await vetApp.close();
    });

    it('rejects unsafe pagination limits', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .query({ limit: 101 })
        .expect(400);

      expect(expensesService.list).not.toHaveBeenCalled();
    });

    it('returns 400 when category is invalid', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/expenses')
        .set('Authorization', 'Bearer admin-token')
        .query({ category: 'invalid_category' })
        .expect(400);

      expect(expensesService.list).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/animals/:animalId/expenses', () => {
    const animalId = '11111111-1111-4111-8111-111111111111';

    it('lists expenses for an animal when called by an admin', async () => {
      expensesService.listByAnimal.mockResolvedValue({
        items: [createExpense({ animalId })],
        page: 1,
        limit: 20,
        total: 1,
      });

      const res = await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/expenses`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toMatchObject({
        page: 1,
        limit: 20,
        total: 1,
        items: [{ id: 'expense-id', animalId }],
      });
      expect(expensesService.listByAnimal).toHaveBeenCalledWith(
        animalId,
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });

    it('returns 404 when the animal does not exist', async () => {
      expensesService.listByAnimal.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Animal with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/animals/${animalId}/expenses`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('GET /api/v1/expenses/:id', () => {
    const expenseId = '22222222-2222-4222-8222-222222222222';
    const missingId = '99999999-9999-4999-8999-999999999999';

    it('returns the expense when found', async () => {
      expensesService.findById.mockResolvedValue(createExpense());

      const res = await request(app.getHttpServer())
        .get(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
      });
      expect(expensesService.findById).toHaveBeenCalledWith(expenseId);
    });

    it('returns 404 when the expense does not exist', async () => {
      expensesService.findById.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Expense with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .get(`/api/v1/expenses/${missingId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  describe('DELETE /api/v1/expenses/:id', () => {
    const expenseId = '22222222-2222-4222-8222-222222222222';
    const missingId = '99999999-9999-4999-8999-999999999999';

    it('soft-deletes the expense when called by an admin', async () => {
      expensesService.softDelete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(204);

      expect(expensesService.softDelete).toHaveBeenCalledWith(expenseId);
    });

    it('returns 403 when called by a veterinarian', async () => {
      const vetApp = await createAppWithGuard(VeterinarianJwtAuthGuard);

      await request(vetApp.getHttpServer())
        .delete(`/api/v1/expenses/${expenseId}`)
        .set('Authorization', 'Bearer vet-token')
        .expect(403);

      expect(expensesService.softDelete).not.toHaveBeenCalled();

      await vetApp.close();
    });

    it('returns 404 when the expense does not exist', async () => {
      expensesService.softDelete.mockRejectedValue(
        new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Expense with id missing-id was not found.',
        }),
      );

      await request(app.getHttpServer())
        .delete(`/api/v1/expenses/${missingId}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(404);
    });
  });

  function createExpense(overrides: Partial<Expense> = {}): Expense {
    const now = new Date('2026-03-10T10:00:00.000Z');

    return Object.assign(
      new Expense(
        'expense-id',
        'animal-id',
        ExpenseCategory.MEDICINE,
        1250,
        'ARS',
        'Antibiotics',
        new Date('2026-03-10T10:00:00.000Z'),
        null,
        'user-id',
        now,
        now,
      ),
      overrides,
    );
  }
});