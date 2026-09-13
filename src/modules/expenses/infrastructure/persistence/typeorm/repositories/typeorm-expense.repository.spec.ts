import { Repository } from 'typeorm';
import { CreateExpense } from '../../../../domain/entities/create-expense.entity';
import { ExpenseCategory } from '../../../../domain/enums/expense-category.enum';
import { ExpenseOrmEntity } from '../entities/expense.orm-entity';
import { TypeOrmExpenseRepository } from './typeorm-expense.repository';

describe('TypeOrmExpenseRepository', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    softDelete: jest.Mock;
  };
  let expenseRepository: TypeOrmExpenseRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      create: jest.fn().mockImplementation((data: object) => Object.assign(new ExpenseOrmEntity(), data)),
      save: jest.fn().mockImplementation(async (entity: { id?: string }) => {
        if (!entity.id) {
          entity.id = 'generated-expense-id';
        }

        return entity;
      }),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    expenseRepository = new TypeOrmExpenseRepository(
      repository as unknown as Repository<ExpenseOrmEntity>,
    );
  });

  describe('save', () => {
    it('persists the expense and maps it to the domain entity', async () => {
      const input = new CreateExpense(
        'animal-id',
        ExpenseCategory.MEDICINE,
        1250,
        'ARS',
        'Antibiotics',
        new Date('2026-03-10T10:00:00.000Z'),
        'user-id',
        'media-id',
      );

      const result = await expenseRepository.save(input);

      expect(repository.create).toHaveBeenCalledWith({
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
        incurredAt: new Date('2026-03-10T10:00:00.000Z'),
        ticketMediaId: 'media-id',
        createdByUserId: 'user-id',
      });
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        id: 'generated-expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
        ticketMediaId: 'media-id',
        createdByUserId: 'user-id',
      });
    });

    it('stores null optionals when they are not informed', async () => {
      const input = new CreateExpense(
        'animal-id',
        ExpenseCategory.FOOD,
        500,
        'ARS',
        'Dog food',
        new Date('2026-03-10T10:00:00.000Z'),
        'user-id',
      );

      await expenseRepository.save(input);

      const data = repository.create.mock.calls[0]![0] as Record<string, unknown>;

      expect(data).toMatchObject({
        ticketMediaId: null,
        createdByUserId: 'user-id',
      });
    });
  });

  describe('findById', () => {
    it('returns a mapped expense when found', async () => {
      const ormEntity = Object.assign(new ExpenseOrmEntity(), {
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
        incurredAt: new Date('2026-03-10T10:00:00.000Z'),
        ticketMediaId: 'media-id',
        createdByUserId: 'user-id',
        createdAt: now,
        updatedAt: now,
      });
      repository.findOne.mockResolvedValue(ormEntity);

      const result = await expenseRepository.findById('expense-id');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'expense-id' } });
      expect(result).toMatchObject({
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
        ticketMediaId: 'media-id',
        createdByUserId: 'user-id',
      });
      expect(result!.createdAt).toBe(now);
      expect(result!.updatedAt).toBe(now);
    });

    it('returns null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(expenseRepository.findById('missing-id')).resolves.toBeNull();
    });
  });

  describe('findMany', () => {
    it('filters by animalId, category and date range with reverse chronological order', async () => {
      const ormEntity = Object.assign(new ExpenseOrmEntity(), {
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        amountCents: 1250,
        currency: 'ARS',
        description: 'Antibiotics',
        incurredAt: new Date('2026-03-10T10:00:00.000Z'),
        ticketMediaId: null,
        createdByUserId: 'user-id',
        createdAt: now,
        updatedAt: now,
      });
      repository.findAndCount.mockResolvedValue([[ormEntity], 5]);

      const result = await expenseRepository.findMany({
        animalId: 'animal-id',
        page: 2,
        limit: 2,
        category: ExpenseCategory.MEDICINE,
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.000Z'),
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toMatchObject({
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
      });
      expect(options.where.incurredAt).toBeDefined();
      expect(options.order).toEqual({ incurredAt: 'DESC', id: 'DESC' });
      expect(options.skip).toBe(2);
      expect(options.take).toBe(2);
      expect(options.withDeleted).toBeUndefined();
      expect(result).toMatchObject({ page: 2, limit: 2, total: 5 });
      expect(result.items[0]).toMatchObject({
        id: 'expense-id',
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
      });
    });

    it('filters only by animalId when optional filters are omitted', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await expenseRepository.findMany({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({ animalId: 'animal-id' });
    });

    it('supports one-sided date ranges', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await expenseRepository.findMany({
        page: 1,
        limit: 20,
        from: new Date('2026-03-01T00:00:00.000Z'),
      });
      await expenseRepository.findMany({
        page: 1,
        limit: 20,
        to: new Date('2026-03-31T23:59:59.000Z'),
      });

      expect(repository.findAndCount.mock.calls[0]![0]!.where.incurredAt).toBeDefined();
      expect(repository.findAndCount.mock.calls[1]![0]!.where.incurredAt).toBeDefined();
    });

    it('does not filter by animalId when listing globally', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await expenseRepository.findMany({
        page: 1,
        limit: 20,
        category: ExpenseCategory.FOOD,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({ category: ExpenseCategory.FOOD });
    });
  });

  describe('softDelete', () => {
    it('soft-deletes the expense', async () => {
      await expenseRepository.softDelete('expense-id');

      expect(repository.softDelete).toHaveBeenCalledWith({ id: 'expense-id' });
    });
  });
});