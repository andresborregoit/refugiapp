import { BadRequestException } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { Animal } from '../../../animals/domain/entities/animal.entity';
import { AnimalSex } from '../../../animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { MediaOwnerType } from '../../../media/domain/enums/media-owner-type.enum';
import { Expense } from '../../domain/entities/expense.entity';
import { ExpenseCategory } from '../../domain/enums/expense-category.enum';
import { CreateExpenseDto } from '../../interfaces/dto/create-expense.dto';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');
  const animal = new Animal(
    'animal-id',
    'Luna',
    'dog',
    'mixed',
    AnimalSex.FEMALE,
    AnimalStatus.ADMITTED,
    new Date('2026-01-01'),
  );
  const expense = new Expense(
    'expense-id',
    'animal-id',
    ExpenseCategory.MEDICINE,
    1250,
    'ARS',
    'Antibiotics',
    new Date('2026-03-10T10:00:00.000Z'),
    'media-id',
    'user-id',
    now,
    now,
  );
  const expenseRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    softDelete: jest.fn(),
  };
  const animalRepository = {
    findById: jest.fn(),
  };
  const mediaAssetRepository = {
    findById: jest.fn(),
  };
  const auditLogsService = {
    record: jest.fn(),
  };
  let service: ExpensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExpensesService(
      expenseRepository,
      animalRepository as unknown as AnimalRepository,
      mediaAssetRepository as unknown as MediaAssetRepository,
      auditLogsService as any,
    );
  });

  function createDto(overrides: Partial<CreateExpenseDto> = {}): CreateExpenseDto {
    return Object.assign(new CreateExpenseDto(), {
      animalId: 'animal-id',
      category: ExpenseCategory.MEDICINE,
      amountCents: 1250,
      currency: ' ARS ',
      description: '  Antibiotics  ',
      incurredAt: '2026-03-10T10:00:00.000Z',
      ...overrides,
    });
  }

  describe('create', () => {
    it('creates an expense with trimmed fields and the authenticated user', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      expenseRepository.save.mockResolvedValue(expense);

      const result = await service.create(createDto(), 'actor-id');

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(mediaAssetRepository.findById).not.toHaveBeenCalled();
      expect(expenseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: 'animal-id',
          category: ExpenseCategory.MEDICINE,
          amountCents: 1250,
          currency: 'ARS',
          description: 'Antibiotics',
          createdByUserId: 'actor-id',
          ticketMediaId: null,
        }),
      );
      const input = expenseRepository.save.mock.calls[0]![0];

      expect(input.incurredAt).toBeInstanceOf(Date);
      expect(result).toBe(expense);
    });

    it('records an expense.create audit event after persisting', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      expenseRepository.save.mockResolvedValue(expense);

      await service.create(createDto(), 'actor-id');

      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'expense-id',
          metadata: expect.objectContaining({ animalId: 'animal-id', amountCents: 1250 }),
        }),
      );
    });

    it('validates the ticket media asset when provided', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById.mockResolvedValue({
        id: 'media-id',
        ownerType: null,
        ownerId: null,
      });
      expenseRepository.save.mockResolvedValue(expense);

      await service.create(createDto({ ticketMediaId: 'media-id' }), 'actor-id');

      expect(mediaAssetRepository.findById).toHaveBeenCalledWith('media-id');
      expect(expenseRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticketMediaId: 'media-id' }),
      );
    });

    it('throws 409 when the ticket media asset belongs to another owner type', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById.mockResolvedValue({
        id: 'media-id',
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'other-animal',
      });

      await expect(
        service.create(createDto({ ticketMediaId: 'media-id' }), 'actor-id'),
      ).rejects.toThrow(ResourceConflictException);
      expect(expenseRepository.save).not.toHaveBeenCalled();
    });

    it('throws 409 when the ticket media asset is already owned', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById.mockResolvedValue({
        id: 'media-id',
        ownerType: MediaOwnerType.EXPENSE_TICKET,
        ownerId: 'other-expense',
      });

      await expect(
        service.create(createDto({ ticketMediaId: 'media-id' }), 'actor-id'),
      ).rejects.toThrow(ResourceConflictException);
      expect(expenseRepository.save).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto(), 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(expenseRepository.save).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the ticket media asset does not exist', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(createDto({ ticketMediaId: 'missing-media' }), 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(expenseRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the expense when it exists', async () => {
      expenseRepository.findById.mockResolvedValue(expense);

      await expect(service.findById('expense-id')).resolves.toBe(expense);
    });

    it('throws ResourceNotFoundException when the expense does not exist', async () => {
      expenseRepository.findById.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('list', () => {
    it('delegates to the repository with filters', async () => {
      const paginated = { items: [expense], page: 2, limit: 10, total: 1 };
      expenseRepository.findMany.mockResolvedValue(paginated);

      const result = await service.list({
        page: 2,
        limit: 10,
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
      });

      expect(expenseRepository.findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        animalId: 'animal-id',
        category: ExpenseCategory.MEDICINE,
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.000Z'),
      });
      expect(result).toBe(paginated);
    });

    it('delegates without filters when none are provided', async () => {
      expenseRepository.findMany.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await service.list({ page: 1, limit: 20 });

      expect(expenseRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        animalId: undefined,
        category: undefined,
        from: undefined,
        to: undefined,
      });
    });

    it('throws BadRequestException when from is after to', async () => {
      await expect(
        service.list({
          page: 1,
          limit: 20,
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(expenseRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('listByAnimal', () => {
    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(service.listByAnimal('missing-id', { page: 1, limit: 20 })).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(expenseRepository.findMany).not.toHaveBeenCalled();
    });

    it('delegates to the repository after confirming the animal exists', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      const paginated = { items: [expense], page: 1, limit: 20, total: 1 };
      expenseRepository.findMany.mockResolvedValue(paginated);

      const result = await service.listByAnimal('animal-id', {
        page: 1,
        limit: 20,
        category: ExpenseCategory.FOOD,
      });

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(expenseRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        animalId: 'animal-id',
        category: ExpenseCategory.FOOD,
        from: undefined,
        to: undefined,
      });
      expect(result).toBe(paginated);
    });

    it('throws BadRequestException when from is after to', async () => {
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.listByAnimal('animal-id', {
          page: 1,
          limit: 20,
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(expenseRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('soft-deletes an existing expense and records the actor', async () => {
      expenseRepository.findById.mockResolvedValue(expense);
      expenseRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('expense-id', 'actor-id');

      expect(expenseRepository.findById).toHaveBeenCalledWith('expense-id');
      expect(expenseRepository.softDelete).toHaveBeenCalledWith('expense-id');
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'expense-id',
        }),
      );
    });

    it('throws ResourceNotFoundException when the expense does not exist', async () => {
      expenseRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('missing-id', 'actor-id')).rejects.toThrow(ResourceNotFoundException);
      expect(expenseRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});