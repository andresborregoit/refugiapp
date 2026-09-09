import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { Animal } from '../../domain/entities/animal.entity';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';
import { AnimalHistoryEventType } from '../../domain/enums/animal-history-event-type.enum';
import { AnimalHistoryEventsService } from './animal-history-events.service';

describe('AnimalHistoryEventsService', () => {
  const animal = new Animal(
    'animal-id',
    'Luna',
    'dog',
    'mixed',
    AnimalSex.FEMALE,
    AnimalStatus.ADMITTED,
    new Date('2026-01-01'),
  );
  const event = {
    id: 'event-id',
    animalId: 'animal-id',
    eventType: AnimalHistoryEventType.GENERAL_NOTE,
    description: 'Moved to foster home.',
    occurredAt: new Date('2026-03-10T10:00:00.000Z'),
    createdByUserId: 'actor-id',
    metadata: {},
  };
  const eventRepository = {
    create: jest.fn(),
    findMany: jest.fn(),
  };
  const animalRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    changeStatus: jest.fn(),
  };
  let service: AnimalHistoryEventsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnimalHistoryEventsService(eventRepository, animalRepository);
  });

  describe('create', () => {
    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        service.create('missing-id', AnimalHistoryEventType.GENERAL_NOTE, 'Note', 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('creates an event with default occurredAt and trimmed description', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      eventRepository.create.mockResolvedValue(event);

      const result = await service.create(
        'animal-id',
        AnimalHistoryEventType.GENERAL_NOTE,
        '  Moved to foster home.  ',
        'actor-id',
      );

      expect(eventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          animalId: 'animal-id',
          eventType: AnimalHistoryEventType.GENERAL_NOTE,
          description: 'Moved to foster home.',
          createdByUserId: 'actor-id',
          metadata: {},
        }),
      );
      const input = eventRepository.create.mock.calls[0]![0];

      expect(input.occurredAt).toBeInstanceOf(Date);
      expect(result).toBe(event);
    });

    it('rejects occurredAt before intakeDate', async () => {
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.create(
          'animal-id',
          AnimalHistoryEventType.GENERAL_NOTE,
          'Note',
          'actor-id',
          '2025-06-01T00:00:00.000Z',
        ),
      ).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        service.list({ animalId: 'missing-id', page: 1, limit: 20 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('delegates to the repository after confirming the animal exists', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      const paginated = { items: [event], page: 1, limit: 20, total: 1 };
      eventRepository.findMany.mockResolvedValue(paginated);

      const result = await service.list({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
      });

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(eventRepository.findMany).toHaveBeenCalledWith({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
        eventType: AnimalHistoryEventType.STATUS_CHANGE,
      });
      expect(result).toBe(paginated);
    });
  });
});
