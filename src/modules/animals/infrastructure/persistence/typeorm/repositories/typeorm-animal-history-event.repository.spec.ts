import { Repository } from 'typeorm';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
import { CreateAnimalHistoryEvent } from '../../../../domain/entities/create-animal-history-event.entity';
import { AnimalHistoryEventOrmEntity } from '../entities/animal-history-event.orm-entity';
import { TypeOrmAnimalHistoryEventRepository } from './typeorm-animal-history-event.repository';

describe('TypeOrmAnimalHistoryEventRepository', () => {
  let repository: jest.Mocked<Pick<Repository<AnimalHistoryEventOrmEntity>, 'findAndCount' | 'save' | 'create'>>;
  let eventRepository: TypeOrmAnimalHistoryEventRepository;

  beforeEach(() => {
    repository = {
      findAndCount: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    eventRepository = new TypeOrmAnimalHistoryEventRepository(
      repository as unknown as Repository<AnimalHistoryEventOrmEntity>,
    );
  });

  describe('create', () => {
    it('persists a new event and maps it to the domain entity', async () => {
      const input = new CreateAnimalHistoryEvent(
        'animal-id',
        AnimalHistoryEventType.GENERAL_NOTE,
        'Moved to foster home.',
        new Date('2026-03-10T10:00:00.000Z'),
        'actor-id',
        {},
      );
      const ormEntity = Object.assign(new AnimalHistoryEventOrmEntity(), {
        id: 'event-id',
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.GENERAL_NOTE,
        description: 'Moved to foster home.',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        createdByUserId: 'actor-id',
        metadata: {},
      });

      repository.create.mockReturnValue(ormEntity);
      repository.save.mockResolvedValue(ormEntity);

      const result = await eventRepository.create(input);

      expect(repository.create).toHaveBeenCalledWith({
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.GENERAL_NOTE,
        description: 'Moved to foster home.',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        createdByUserId: 'actor-id',
        metadata: {},
      });
      expect(result).toMatchObject({
        id: 'event-id',
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.GENERAL_NOTE,
        description: 'Moved to foster home.',
        createdByUserId: 'actor-id',
        metadata: {},
      });
    });
  });

  describe('findMany', () => {
    it('filters by animalId and eventType with reverse chronological order', async () => {
      const entity = Object.assign(new AnimalHistoryEventOrmEntity(), {
        id: 'event-id',
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
        description: 'Status changed from admitted to under_treatment.',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        createdByUserId: 'actor-id',
        metadata: { from: 'admitted', to: 'under_treatment' },
      });
      repository.findAndCount.mockResolvedValue([[entity], 5]);

      const result = await eventRepository.findMany({
        animalId: 'animal-id',
        page: 2,
        limit: 2,
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
      });
      expect(options.order).toEqual({ occurredAt: 'DESC', id: 'DESC' });
      expect(options.skip).toBe(2);
      expect(options.take).toBe(2);
      expect(options.withDeleted).toBeUndefined();
      expect(result).toMatchObject({ page: 2, limit: 2, total: 5 });
      expect(result.items[0]).toMatchObject({
        id: 'event-id',
        createdByUserId: 'actor-id',
        metadata: { from: 'admitted', to: 'under_treatment' },
      });
    });

    it('filters only by animalId when eventType is omitted', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await eventRepository.findMany({ animalId: 'animal-id', page: 1, limit: 20 });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({ animalId: 'animal-id' });
    });

    it('maps null createdByUserId and missing metadata', async () => {
      const entity = Object.assign(new AnimalHistoryEventOrmEntity(), {
        id: 'event-id',
        animalId: 'animal-id',
        eventType: AnimalHistoryEventType.INTAKE,
        description: 'Animal admitted to the shelter.',
        occurredAt: new Date('2026-01-01'),
        createdByUserId: null,
        metadata: {},
      });
      repository.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await eventRepository.findMany({ animalId: 'animal-id', page: 1, limit: 20 });

      expect(result.items[0]).toMatchObject({
        createdByUserId: null,
        metadata: {},
      });
    });
  });
});
