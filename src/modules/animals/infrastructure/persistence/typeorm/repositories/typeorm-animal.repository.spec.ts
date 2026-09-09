import { Repository } from 'typeorm';
import { AnimalSex } from '../../../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../../domain/enums/animal-status.enum';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
import { CreateAnimal } from '../../../../domain/entities/create-animal.entity';
import { ChangeAnimalStatus } from '../../../../domain/entities/change-animal-status.entity';
import { buildStatusChangeEventDescription, INTAKE_EVENT_DESCRIPTION } from '../../../../domain/entities/animal-history-event.entity';
import { AnimalHistoryEventOrmEntity } from '../entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../entities/animal.orm-entity';
import { TypeOrmAnimalRepository } from './typeorm-animal.repository';

describe('TypeOrmAnimalRepository', () => {
  const transactionManager = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  let repository: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let animalRepository: TypeOrmAnimalRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.create.mockImplementation(
      (target: new () => object, data: object) => Object.assign(new target(), data),
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
          .mockImplementation(
            async (run: (manager: unknown) => Promise<unknown>) => run(transactionManager),
          ),
      },
    };
    animalRepository = new TypeOrmAnimalRepository(
      repository as unknown as Repository<AnimalOrmEntity>,
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

    expect(transactionManager.create).toHaveBeenNthCalledWith(
      1,
      AnimalOrmEntity,
      {
        name: 'Luna',
        species: 'dog',
        breed: 'mixed',
        sex: AnimalSex.FEMALE,
        status: AnimalStatus.ADMITTED,
        birthDate: '2025-06-01',
        intakeDate: '2026-01-10',
        profilePhotoMediaId: 'media-id',
        notes: null,
      },
    );

    expect(transactionManager.create).toHaveBeenNthCalledWith(
      2,
      AnimalHistoryEventOrmEntity,
      {
        animalId: 'generated-animal-id',
        eventType: AnimalHistoryEventType.INTAKE,
        description: INTAKE_EVENT_DESCRIPTION,
        occurredAt: new Date('2026-01-10T00:00:00.000Z'),
        createdByUserId: 'user-id',
        metadata: {},
      },
    );

    expect(transactionManager.save).toHaveBeenCalledTimes(2);

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
      expect(transactionManager.update).toHaveBeenCalledWith(
        AnimalOrmEntity,
        'animal-id',
        { status: AnimalStatus.UNDER_TREATMENT },
      );
      expect(transactionManager.create).toHaveBeenCalledWith(
        AnimalHistoryEventOrmEntity,
        {
          animalId: 'animal-id',
          eventType: AnimalHistoryEventType.STATUS_CHANGE,
          description: buildStatusChangeEventDescription(
            AnimalStatus.ADMITTED,
            AnimalStatus.UNDER_TREATMENT,
          ),
          occurredAt: new Date('2026-03-10T10:00:00.000Z'),
          createdByUserId: 'actor-id',
          metadata: { from: AnimalStatus.ADMITTED, to: AnimalStatus.UNDER_TREATMENT },
        },
      );
      expect(transactionManager.save).toHaveBeenCalledTimes(1);
      expect(transactionManager.findOneOrFail).toHaveBeenCalledWith(
        AnimalOrmEntity,
        { where: { id: 'animal-id' } },
      );
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

      expect(transactionManager.findOneOrFail).toHaveBeenCalledWith(
        AnimalOrmEntity,
        { where: { id: 'animal-id' } },
      );
    });
  });
});
