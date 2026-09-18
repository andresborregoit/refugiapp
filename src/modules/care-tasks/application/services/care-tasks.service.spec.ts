import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { Animal } from '../../../animals/domain/entities/animal.entity';
import { AnimalSex } from '../../../animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { CareTask } from '../../domain/entities/care-task.entity';
import { CareTaskStatus } from '../../domain/enums/care-task-status.enum';
import { CreateCareTaskDto } from '../../interfaces/dto/create-care-task.dto';
import { CareTasksService } from './care-tasks.service';

describe('CareTasksService', () => {
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
  const careTask = new CareTask(
    'task-id',
    'animal-id',
    'Daily feeding',
    'Two portions',
    CareTaskStatus.PENDING,
    null,
    null,
    'user-id',
    now,
    now,
  );
  const careTaskRepository = {
    findById: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    complete: jest.fn(),
    cancel: jest.fn(),
  };
  const animalRepository = {
    findById: jest.fn(),
  };
  const auditLogsService = {
    record: jest.fn(),
  };
  let service: CareTasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CareTasksService(
      careTaskRepository,
      animalRepository as unknown as AnimalRepository,
      auditLogsService as any,
    );
  });

  function createDto(overrides: Partial<CreateCareTaskDto> = {}): CreateCareTaskDto {
    return Object.assign(new CreateCareTaskDto(), {
      animalId: 'animal-id',
      title: '  Daily feeding  ',
      description: '  Two portions  ',
      dueAt: '2026-03-15T10:00:00.000Z',
      ...overrides,
    });
  }

  describe('create', () => {
    it('creates a pending task with trimmed fields and the authenticated actor', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      careTaskRepository.create.mockResolvedValue(careTask);

      const result = await service.create(createDto(), 'actor-id');

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(careTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: 'animal-id',
          title: 'Daily feeding',
          description: 'Two portions',
          dueAt: new Date('2026-03-15T10:00:00.000Z'),
          createdByUserId: 'actor-id',
        }),
      );
      expect(result).toBe(careTask);
    });

    it('stores null optionals when they are not informed', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      careTaskRepository.create.mockResolvedValue(careTask);

      await service.create(createDto({ description: undefined, dueAt: undefined }), 'actor-id');

      const input = careTaskRepository.create.mock.calls[0]![0] as CreateCareTaskDto;
      expect(input).toMatchObject({ description: null, dueAt: null });
    });

    it('records a care_task.create audit event after persisting', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      careTaskRepository.create.mockResolvedValue(careTask);

      await service.create(createDto(), 'actor-id');

      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'task-id',
          metadata: expect.objectContaining({ animalId: 'animal-id', title: 'Daily feeding' }),
        }),
      );
    });

    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto(), 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(careTaskRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the task when it exists', async () => {
      careTaskRepository.findById.mockResolvedValue(careTask);

      await expect(service.findById('task-id')).resolves.toBe(careTask);
    });

    it('throws ResourceNotFoundException when the task does not exist', async () => {
      careTaskRepository.findById.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('list', () => {
    it('delegates to the repository with filters and pagination', async () => {
      const paginated = { items: [careTask], page: 2, limit: 10, total: 1 };
      animalRepository.findById.mockResolvedValue(animal);
      careTaskRepository.findMany.mockResolvedValue(paginated);

      const result = await service.list({
        page: 2,
        limit: 10,
        animalId: 'animal-id',
        status: CareTaskStatus.PENDING,
      });

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(careTaskRepository.findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        animalId: 'animal-id',
        status: CareTaskStatus.PENDING,
      });
      expect(result).toBe(paginated);
    });

    it('does not validate the animal when no filter is provided', async () => {
      careTaskRepository.findMany.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await service.list({ page: 1, limit: 20 });

      expect(animalRepository.findById).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the animal filter does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        service.list({ page: 1, limit: 20, animalId: 'missing-animal' }),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(careTaskRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates only the provided fields', async () => {
      careTaskRepository.findById.mockResolvedValue(careTask);
      careTaskRepository.update.mockResolvedValue(careTask);

      await service.update('task-id', { title: 'Changed' }, 'actor-id');

      expect(careTaskRepository.update).toHaveBeenCalledWith(
        'task-id',
        expect.objectContaining({ title: 'Changed' }),
      );
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'task-id',
        }),
      );
    });

    it('clears nullable fields with explicit null', async () => {
      careTaskRepository.findById.mockResolvedValue(careTask);
      careTaskRepository.update.mockResolvedValue(careTask);

      await service.update('task-id', { description: null, dueAt: null }, 'actor-id');

      const input = careTaskRepository.update.mock.calls[0]![1] as {
        description?: string | null;
        dueAt?: Date | null;
      };
      expect(input).toMatchObject({ description: null, dueAt: null });
    });

    it('throws ResourceNotFoundException when the task does not exist', async () => {
      careTaskRepository.findById.mockResolvedValue(null);

      await expect(service.update('missing-id', { title: 'x' }, 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(careTaskRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('completes a pending task and records the actor', async () => {
      careTaskRepository.findById.mockResolvedValue(careTask);
      const completed = new CareTask(
        'task-id',
        'animal-id',
        'Daily feeding',
        'Two portions',
        CareTaskStatus.COMPLETED,
        null,
        new Date('2026-03-10T11:00:00.000Z'),
        'user-id',
        now,
        now,
      );
      careTaskRepository.complete.mockResolvedValue(completed);

      const result = await service.complete('task-id', 'actor-id');

      expect(careTaskRepository.complete).toHaveBeenCalledWith('task-id');
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'task-id',
        }),
      );
      expect(result.status).toBe(CareTaskStatus.COMPLETED);
    });

    it('throws 409 when the task is not pending', async () => {
      careTaskRepository.findById.mockResolvedValue(
        new CareTask(
          'task-id',
          'animal-id',
          'x',
          null,
          CareTaskStatus.CANCELLED,
          null,
          null,
          'user-id',
          now,
          now,
        ),
      );

      await expect(service.complete('task-id', 'actor-id')).rejects.toThrow(
        ResourceConflictException,
      );
      expect(careTaskRepository.complete).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the task does not exist', async () => {
      careTaskRepository.findById.mockResolvedValue(null);

      await expect(service.complete('missing-id', 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('cancels a pending task and records the actor', async () => {
      careTaskRepository.findById.mockResolvedValue(careTask);
      const cancelled = new CareTask(
        'task-id',
        'animal-id',
        'Daily feeding',
        'Two portions',
        CareTaskStatus.CANCELLED,
        null,
        null,
        'user-id',
        now,
        now,
      );
      careTaskRepository.cancel.mockResolvedValue(cancelled);

      const result = await service.cancel('task-id', 'actor-id');

      expect(careTaskRepository.cancel).toHaveBeenCalledWith('task-id');
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'task-id',
        }),
      );
      expect(result.status).toBe(CareTaskStatus.CANCELLED);
    });

    it('throws 409 when the task is not pending', async () => {
      careTaskRepository.findById.mockResolvedValue(
        new CareTask(
          'task-id',
          'animal-id',
          'x',
          null,
          CareTaskStatus.COMPLETED,
          null,
          now,
          'user-id',
          now,
          now,
        ),
      );

      await expect(service.cancel('task-id', 'actor-id')).rejects.toThrow(
        ResourceConflictException,
      );
      expect(careTaskRepository.cancel).not.toHaveBeenCalled();
    });
  });
});