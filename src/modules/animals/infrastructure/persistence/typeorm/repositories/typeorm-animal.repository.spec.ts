import { Repository } from 'typeorm';
import { CareTaskStatus } from '../../../../../care-tasks/domain/enums/care-task-status.enum';
import { MediaOwnerType } from '../../../../../media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { AnimalSex } from '../../../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../../domain/enums/animal-status.enum';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
import { CreateAnimal } from '../../../../domain/entities/create-animal.entity';
import { ChangeAnimalStatus } from '../../../../domain/entities/change-animal-status.entity';
import { UpdateAnimal } from '../../../../domain/entities/update-animal.entity';
import {
  buildStatusChangeEventDescription,
  INTAKE_EVENT_DESCRIPTION,
} from '../../../../domain/entities/animal-history-event.entity';
import { AnimalHistoryEventOrmEntity } from '../entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../entities/animal.orm-entity';
import { TypeOrmAnimalRepository } from './typeorm-animal.repository';

describe('TypeOrmAnimalRepository', () => {
  const transactionManager = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    softDelete: jest.fn(),
  };
  const careTaskRepository = { count: jest.fn() };
  const medicalRecordRepository = { count: jest.fn() };
  const expenseRepository = { count: jest.fn() };
  const adoptionApplicationRepository = { count: jest.fn() };
  const adoptionRepository = { count: jest.fn() };
  let repository: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let animalRepository: TypeOrmAnimalRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.create.mockImplementation((target: new () => object, data: object) =>
      Object.assign(new target(), data),
    );
    transactionManager.save.mockImplementation(async (entity: { id?: string }) => {
      if (!entity.id) {
        entity.id = 'generated-animal-id';
      }

      return entity;
    });
    transactionManager.findOneOrFail.mockResolvedValue(
      Object.assign(new AnimalOrmEntity(), {
        id: 'animal-id',
        name: 'Luna',
        species: 'dog',
        breed: 'mixed',
        sex: AnimalSex.FEMALE,
        status: AnimalStatus.UNDER_TREATMENT,
        intakeDate: '2026-01-01',
        birthDate: '2025-06-01',
        notes: null,
        profilePhotoMediaId: 'media-id',
      }),
    );
    repository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(async (run: (manager: unknown) => Promise<unknown>) =>
            run(transactionManager),
          ),
      },
    };
    animalRepository = new TypeOrmAnimalRepository(
      repository as unknown as Repository<AnimalOrmEntity>,
      careTaskRepository as never,
      medicalRecordRepository as never,
      expenseRepository as never,
      adoptionApplicationRepository as never,
      adoptionRepository as never,
    );
  });

  it('saves the animal and its automatic intake event in a single transaction', async () => {
    const input = new CreateAnimal(
      'Luna',
      'dog',
      'mixed',
      AnimalSex.FEMALE,
      AnimalStatus.ADMITTED,
      new Date('2026-01-10T00:00:00.000Z'),
      new Date('2025-06-01T00:00:00.000Z'),
      null,
      'media-id',
      'user-id',
    );

    const result = await animalRepository.create(input);

    expect(repository.manager.transaction).toHaveBeenCalled();

    expect(transactionManager.create).toHaveBeenNthCalledWith(1, AnimalOrmEntity, {
      name: 'Luna',
      species: 'dog',
      breed: 'mixed',
      sex: AnimalSex.FEMALE,
      status: AnimalStatus.ADMITTED,
      birthDate: '2025-06-01',
      intakeDate: '2026-01-10',
      profilePhotoMediaId: 'media-id',
      notes: null,
    });

    expect(transactionManager.create).toHaveBeenNthCalledWith(2, AnimalHistoryEventOrmEntity, {
      animalId: 'generated-animal-id',
      eventType: AnimalHistoryEventType.INTAKE,
      description: INTAKE_EVENT_DESCRIPTION,
      occurredAt: new Date('2026-01-10T00:00:00.000Z'),
      createdByUserId: 'user-id',
      metadata: {},
    });

    expect(transactionManager.save).toHaveBeenCalledTimes(2);

    expect(transactionManager.update).toHaveBeenCalledWith(
      MediaAssetOrmEntity,
      { id: 'media-id' },
      { ownerType: MediaOwnerType.ANIMAL, ownerId: 'generated-animal-id' },
    );

    expect(result).toMatchObject({
      id: 'generated-animal-id',
      name: 'Luna',
      species: 'dog',
      breed: 'mixed',
      sex: AnimalSex.FEMALE,
      status: AnimalStatus.ADMITTED,
      intakeDate: new Date('2026-01-10T00:00:00.000Z'),
      birthDate: new Date('2025-06-01T00:00:00.000Z'),
      notes: null,
      profilePhotoMediaId: 'media-id',
    });
  });

  it('stores null optional fields when they are not informed', async () => {
    const input = new CreateAnimal(
      'Luna',
      'dog',
      null,
      AnimalSex.UNKNOWN,
      AnimalStatus.ADMITTED,
      new Date('2026-01-10T00:00:00.000Z'),
    );

    await animalRepository.create(input);

    const animalData = transactionManager.create.mock.calls[0]![1] as Record<string, unknown>;

    expect(animalData).toMatchObject({
      breed: null,
      birthDate: null,
      profilePhotoMediaId: null,
      notes: null,
    });

    const eventData = transactionManager.create.mock.calls[1]![1] as Record<string, unknown>;

    expect(eventData).toMatchObject({ createdByUserId: null });
  });

  it('updates the animal and replaces its profile photo in one transaction', async () => {
    transactionManager.findOne
      .mockResolvedValueOnce(
        Object.assign(new AnimalOrmEntity(), {
          id: 'animal-id',
          name: 'Luna',
          species: 'dog',
          breed: 'mixed',
          sex: AnimalSex.FEMALE,
          status: AnimalStatus.ADMITTED,
          intakeDate: '2026-01-01',
          birthDate: null,
          profilePhotoMediaId: 'old-media-id',
        }),
      )
      .mockResolvedValueOnce(
        Object.assign(new AnimalOrmEntity(), {
          id: 'animal-id',
          name: 'Roger',
          species: 'cat',
          breed: 'white',
          sex: AnimalSex.MALE,
          status: AnimalStatus.ADMITTED,
          intakeDate: '2026-01-10',
          birthDate: '2025-01-01',
          profilePhotoMediaId: 'new-media-id',
        }),
      );

    const result = await animalRepository.update(
      'animal-id',
      new UpdateAnimal(
        'Roger',
        'cat',
        'white',
        AnimalSex.MALE,
        new Date('2026-01-10'),
        new Date('2025-01-01'),
        'new-media-id',
      ),
    );

    expect(transactionManager.update).toHaveBeenNthCalledWith(
      1,
      AnimalOrmEntity,
      'animal-id',
      expect.objectContaining({ profilePhotoMediaId: 'new-media-id' }),
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      2,
      MediaAssetOrmEntity,
      { id: 'old-media-id' },
      { ownerType: null, ownerId: null },
    );
    expect(transactionManager.update).toHaveBeenNthCalledWith(
      3,
      MediaAssetOrmEntity,
      { id: 'new-media-id' },
      { ownerType: MediaOwnerType.ANIMAL, ownerId: 'animal-id' },
    );
    expect(result).toMatchObject({ id: 'animal-id', profilePhotoMediaId: 'new-media-id' });
  });

  it('applies combined filters, pagination and stable ordering', async () => {
    const entity = Object.assign(new AnimalOrmEntity(), {
      id: 'animal-id',
      name: 'Luna',
      species: 'dog',
      breed: 'mixed',
      sex: AnimalSex.FEMALE,
      status: AnimalStatus.ADMITTED,
      intakeDate: '2026-01-01',
      birthDate: '2025-01-01',
      notes: 'Friendly',
      profilePhotoMediaId: 'media-id',
    });
    repository.findAndCount.mockResolvedValue([[entity], 21]);

    const result = await animalRepository.findMany({
      page: 3,
      limit: 10,
      status: AnimalStatus.ADMITTED,
      species: 'dog',
      sex: AnimalSex.FEMALE,
      name: 'Lu%na',
    });

    const options = repository.findAndCount.mock.calls[0]![0]!;

    expect(options.where).toEqual(
      expect.objectContaining({
        status: AnimalStatus.ADMITTED,
        species: 'dog',
        sex: AnimalSex.FEMALE,
      }),
    );
    expect(options.where).toHaveProperty('name');
    expect(options.skip).toBe(20);
    expect(options.take).toBe(10);
    expect(options.order).toEqual({ createdAt: 'ASC', id: 'ASC' });
    expect(options.withDeleted).toBeUndefined();
    expect(result).toMatchObject({ page: 3, limit: 10, total: 21 });
    expect(result.items[0]).toMatchObject({
      id: 'animal-id',
      breed: 'mixed',
      birthDate: new Date('2025-01-01'),
      notes: 'Friendly',
      profilePhotoMediaId: 'media-id',
    });
  });

  it('returns an empty page when no animals match', async () => {
    repository.findAndCount.mockResolvedValue([[], 0]);

    await expect(
      animalRepository.findMany({ page: 1, limit: 20, name: 'missing' }),
    ).resolves.toEqual({ items: [], page: 1, limit: 20, total: 0 });
  });

  it('does not include soft-deleted animals in individual queries', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(animalRepository.findById('deleted-id')).resolves.toBeNull();
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'deleted-id' } });
  });

  describe('changeStatus', () => {
    it('updates the status and creates a status_change event in a transaction', async () => {
      const input = new ChangeAnimalStatus(
        'animal-id',
        AnimalStatus.ADMITTED,
        AnimalStatus.UNDER_TREATMENT,
        new Date('2026-03-10T10:00:00.000Z'),
        'actor-id',
      );

      const result = await animalRepository.changeStatus(input);

      expect(repository.manager.transaction).toHaveBeenCalled();
      expect(transactionManager.update).toHaveBeenCalledWith(AnimalOrmEntity, 'animal-id', {
        status: AnimalStatus.UNDER_TREATMENT,
      });
      expect(transactionManager.create).toHaveBeenCalledWith(AnimalHistoryEventOrmEntity, {
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
        description: buildStatusChangeEventDescription(
          AnimalStatus.ADMITTED,
          AnimalStatus.UNDER_TREATMENT,
        ),
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        createdByUserId: 'actor-id',
        metadata: { from: AnimalStatus.ADMITTED, to: AnimalStatus.UNDER_TREATMENT },
      });
      expect(transactionManager.save).toHaveBeenCalledTimes(1);
      expect(transactionManager.findOneOrFail).toHaveBeenCalledWith(AnimalOrmEntity, {
        where: { id: 'animal-id' },
      });
      expect(result).toMatchObject({
        id: 'animal-id',
        status: AnimalStatus.UNDER_TREATMENT,
      });
    });

    it('does not use withDeleted for status updates', async () => {
      const input = new ChangeAnimalStatus(
        'animal-id',
        AnimalStatus.ADMITTED,
        AnimalStatus.DECEASED,
        new Date('2026-06-01T00:00:00.000Z'),
        'actor-id',
      );

      await animalRepository.changeStatus(input);

      expect(transactionManager.findOneOrFail).toHaveBeenCalledWith(AnimalOrmEntity, {
        where: { id: 'animal-id' },
      });
    });
  });

  describe('countPendingCareTasks', () => {
    it('counts only pending care tasks for the animal', async () => {
      careTaskRepository.count.mockResolvedValue(2);

      await expect(animalRepository.countPendingCareTasks('animal-id')).resolves.toBe(2);

      expect(careTaskRepository.count).toHaveBeenCalledWith({
        where: { animalId: 'animal-id', status: CareTaskStatus.PENDING },
      });
    });
  });

  describe('countHistoricalRecords', () => {
    it('sums clinical records, expenses and adoptions including soft-deleted rows', async () => {
      medicalRecordRepository.count.mockResolvedValue(1);
      expenseRepository.count.mockResolvedValue(2);
      adoptionApplicationRepository.count.mockResolvedValue(3);
      adoptionRepository.count.mockResolvedValue(4);

      await expect(animalRepository.countHistoricalRecords('animal-id')).resolves.toBe(10);

      for (const childRepository of [
        medicalRecordRepository,
        expenseRepository,
        adoptionApplicationRepository,
        adoptionRepository,
      ]) {
        expect(childRepository.count).toHaveBeenCalledWith({
          where: { animalId: 'animal-id' },
          withDeleted: true,
        });
      }
    });
  });

  describe('softDelete', () => {
    it('detaches the profile photo and soft deletes the animal in one transaction', async () => {
      transactionManager.findOne.mockResolvedValue(
        Object.assign(new AnimalOrmEntity(), {
          id: 'animal-id',
          profilePhotoMediaId: 'media-id',
        }),
      );
      transactionManager.softDelete.mockResolvedValue({ affected: 1 });

      await expect(animalRepository.softDelete('animal-id')).resolves.toBe(true);

      expect(transactionManager.update).toHaveBeenCalledWith(
        MediaAssetOrmEntity,
        { id: 'media-id' },
        { ownerType: null, ownerId: null },
      );
      expect(transactionManager.softDelete).toHaveBeenCalledWith(AnimalOrmEntity, {
        id: 'animal-id',
      });
    });

    it('soft deletes the animal without touching media when there is no profile photo', async () => {
      transactionManager.findOne.mockResolvedValue(
        Object.assign(new AnimalOrmEntity(), { id: 'animal-id', profilePhotoMediaId: null }),
      );
      transactionManager.softDelete.mockResolvedValue({ affected: 1 });

      await expect(animalRepository.softDelete('animal-id')).resolves.toBe(true);

      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('returns false and does not delete when the animal is missing', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(animalRepository.softDelete('missing-id')).resolves.toBe(false);

      expect(transactionManager.softDelete).not.toHaveBeenCalled();
    });
  });
});
