import { Repository } from 'typeorm';
import { CreateCareTask } from '../../../../domain/entities/create-care-task.entity';
import { CareTaskStatus } from '../../../../domain/enums/care-task-status.enum';
import { CareTaskOrmEntity } from '../entities/care-task.orm-entity';
import { TypeOrmCareTaskRepository } from './typeorm-care-task.repository';

describe('TypeOrmCareTaskRepository', () => {
  const now = new Date('2026-03-10T10:00:00.000Z');
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let careTaskRepository: TypeOrmCareTaskRepository;

function resolveData(first: unknown, second: unknown): { id?: string } & Record<string, unknown> {
  return (second !== undefined ? second : first) as { id?: string } & Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  repository = {
    create: jest.fn().mockImplementation((first: unknown, second?: unknown) => {
      const hasTarget = second !== undefined;
      const target = hasTarget ? (first as new () => object) : CareTaskOrmEntity;
      const data = hasTarget ? (second as object) : (first as object);

      return Object.assign(new target(), data);
    }),
    save: jest.fn().mockImplementation(async (first: unknown, second?: unknown) => {
      const entity = resolveData(first, second);

      if (!entity.id) {
        entity.id = 'generated-task-id';
      }

      return entity;
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback: (manager: unknown) => unknown) =>
        callback(repository),
      ),
    },
  };
  careTaskRepository = new TypeOrmCareTaskRepository(
    repository as unknown as Repository<CareTaskOrmEntity>,
  );
});

  describe('create', () => {
    it('persists a pending task and maps it to the domain entity', async () => {
      const input = new CreateCareTask(
        'animal-id',
        'Daily feeding',
        'Two portions',
        new Date('2026-03-15T10:00:00.000Z'),
        'user-id',
      );

      const result = await careTaskRepository.create(input);

      expect(repository.create).toHaveBeenCalledWith({
        animalId: 'animal-id',
        title: 'Daily feeding',
        description: 'Two portions',
        status: CareTaskStatus.PENDING,
        dueAt: new Date('2026-03-15T10:00:00.000Z'),
        completedAt: null,
        createdByUserId: 'user-id',
      });
      expect(result).toMatchObject({
        id: 'generated-task-id',
        animalId: 'animal-id',
        title: 'Daily feeding',
        status: CareTaskStatus.PENDING,
      });
    });
  });

  describe('findById', () => {
    it('returns a mapped task when found', async () => {
      repository.findOne.mockResolvedValue(
        Object.assign(new CareTaskOrmEntity(), {
          id: 'task-id',
          animalId: 'animal-id',
          title: 'Daily feeding',
          description: 'Two portions',
          status: CareTaskStatus.COMPLETED,
          dueAt: null,
          completedAt: now,
          createdByUserId: 'user-id',
          createdAt: now,
          updatedAt: now,
        }),
      );

      const result = await careTaskRepository.findById('task-id');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'task-id' } });
      expect(result).toMatchObject({
        id: 'task-id',
        animalId: 'animal-id',
        status: CareTaskStatus.COMPLETED,
      });
      expect(result!.completedAt).toBe(now);
    });

    it('returns null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(careTaskRepository.findById('missing-id')).resolves.toBeNull();
    });
  });

  describe('findMany', () => {
    it('filters by animalId and status with a deterministic order', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await careTaskRepository.findMany({
        animalId: 'animal-id',
        status: CareTaskStatus.PENDING,
        page: 2,
        limit: 10,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;
      expect(options.where).toEqual({
        animalId: 'animal-id',
        status: CareTaskStatus.PENDING,
      });
      expect(options.order).toEqual({ createdAt: 'DESC', id: 'DESC' });
      expect(options.skip).toBe(10);
      expect(options.take).toBe(10);
    });

    it('filters only by animalId when status is omitted', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await careTaskRepository.findMany({ animalId: 'animal-id', page: 1, limit: 20 });

      expect(repository.findAndCount.mock.calls[0]![0]!.where).toEqual({ animalId: 'animal-id' });
    });
  });

  describe('update', () => {
    it('updates only the provided fields inside a transaction', async () => {
      const entity = Object.assign(new CareTaskOrmEntity(), {
        id: 'task-id',
        animalId: 'animal-id',
        title: 'Old title',
        description: 'Old description',
        status: CareTaskStatus.PENDING,
        dueAt: null,
        completedAt: null,
        createdByUserId: 'user-id',
        createdAt: now,
        updatedAt: now,
      });
      repository.findOne.mockResolvedValue(entity);
      repository.save.mockImplementation(
        async (_target: unknown, saved: CareTaskOrmEntity) => {
          saved.updatedAt = now;
          return saved;
        },
      );

      const result = await careTaskRepository.update('task-id', {
        title: 'New title',
        description: null,
      });

      expect(entity).toMatchObject({ title: 'New title', description: null });
      expect(repository.save).toHaveBeenCalledWith(CareTaskOrmEntity, entity);
      expect(result).toMatchObject({ id: 'task-id', title: 'New title', description: null });
    });

    it('returns null when the task does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        careTaskRepository.update('missing-id', { title: 'x' }),
      ).resolves.toBeNull();
    });
  });

  describe('complete', () => {
    it('marks the task completed and stamps completedAt', async () => {
      const entity = Object.assign(new CareTaskOrmEntity(), {
        id: 'task-id',
        animalId: 'animal-id',
        title: 'x',
        status: CareTaskStatus.PENDING,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      repository.findOne.mockResolvedValue(entity);
      repository.save.mockImplementation(
        async (_target: unknown, saved: CareTaskOrmEntity) => {
          saved.updatedAt = now;
          return saved;
        },
      );

      const result = await careTaskRepository.complete('task-id');

      expect(entity.status).toBe(CareTaskStatus.COMPLETED);
      expect(entity.completedAt).toBeInstanceOf(Date);
      expect(result!.status).toBe(CareTaskStatus.COMPLETED);
      expect(result!.completedAt).toBeInstanceOf(Date);
    });

    it('returns null when the task does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(careTaskRepository.complete('missing-id')).resolves.toBeNull();
    });
  });

  describe('cancel', () => {
    it('marks the task cancelled', async () => {
      const entity = Object.assign(new CareTaskOrmEntity(), {
        id: 'task-id',
        animalId: 'animal-id',
        title: 'x',
        status: CareTaskStatus.PENDING,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      repository.findOne.mockResolvedValue(entity);
      repository.save.mockImplementation(
        async (_target: unknown, saved: CareTaskOrmEntity) => {
          saved.updatedAt = now;
          return saved;
        },
      );

      const result = await careTaskRepository.cancel('task-id');

      expect(entity.status).toBe(CareTaskStatus.CANCELLED);
      expect(result!.status).toBe(CareTaskStatus.CANCELLED);
    });

    it('returns null when the task does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(careTaskRepository.cancel('missing-id')).resolves.toBeNull();
    });
  });
});