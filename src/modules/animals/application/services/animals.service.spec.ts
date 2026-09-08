import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';
import { Animal } from '../../domain/entities/animal.entity';
import { AnimalsService } from './animals.service';

describe('AnimalsService', () => {
  const animal = new Animal(
    'animal-id',
    'Luna',
    'dog',
    AnimalSex.FEMALE,
    AnimalStatus.ADMITTED,
    new Date('2026-01-01'),
  );
  const animalRepository = {
    findById: jest.fn(),
    findMany: jest.fn(),
  };
  let service: AnimalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnimalsService(animalRepository);
  });

  it('delegates paginated queries to the repository', async () => {
    const query = { page: 2, limit: 10, status: AnimalStatus.ADMITTED };
    const result = { items: [animal], page: 2, limit: 10, total: 11 };
    animalRepository.findMany.mockResolvedValue(result);

    await expect(service.list(query)).resolves.toEqual(result);
    expect(animalRepository.findMany).toHaveBeenCalledWith(query);
  });

  it('returns an animal when it exists', async () => {
    animalRepository.findById.mockResolvedValue(animal);

    await expect(service.findById('animal-id')).resolves.toBe(animal);
  });

  it('throws ResourceNotFoundException when the animal does not exist', async () => {
    animalRepository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(ResourceNotFoundException);
  });
});
