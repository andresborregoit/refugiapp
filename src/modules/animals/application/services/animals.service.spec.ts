import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { MediaService } from '../../../media/application/services/media.service';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';
import { Animal } from '../../domain/entities/animal.entity';
import { CreateAnimal } from '../../domain/entities/create-animal.entity';
import { CreateAnimalDto } from '../../interfaces/dto/create-animal.dto';
import { AnimalsService } from './animals.service';

describe('AnimalsService', () => {
  const animal = new Animal(
    'animal-id',
    'Luna',
    'dog',
    'mixed',
    AnimalSex.FEMALE,
    AnimalStatus.ADMITTED,
    new Date('2026-01-01'),
  );
  const animalRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
  };
  const mediaService = {
    findById: jest.fn(),
  };
  let service: AnimalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnimalsService(animalRepository, mediaService as unknown as MediaService);
  });

  describe('create', () => {
    function createDto(overrides: Partial<CreateAnimalDto> = {}): CreateAnimalDto {
      return Object.assign(new CreateAnimalDto(), {
        name: '  Luna  ',
        species: ' dog ',
        intakeDate: '2026-01-10',
        ...overrides,
      });
    }

    it('creates an animal applying defaults and delegating to the repository', async () => {
      animalRepository.create.mockResolvedValue(animal);

      const result = await service.create(createDto(), 'user-id');

      expect(mediaService.findById).not.toHaveBeenCalled();
      expect(animalRepository.create).toHaveBeenCalledWith(
        expect.any(CreateAnimal),
      );

      const input = animalRepository.create.mock.calls[0]![0] as CreateAnimal;

      expect(input).toMatchObject({
        name: 'Luna',
        species: 'dog',
        breed: null,
        sex: AnimalSex.UNKNOWN,
        status: AnimalStatus.ADMITTED,
        intakeDate: new Date('2026-01-10'),
        birthDate: null,
        notes: null,
        profilePhotoMediaId: null,
        createdByUserId: 'user-id',
      });
      expect(result).toBe(animal);
    });

    it('creates an animal when the profile photo media asset exists', async () => {
      mediaService.findById.mockResolvedValue({
        id: 'media-id',
        ownerType: 'animal',
        ownerId: 'animal-id',
      });
      animalRepository.create.mockResolvedValue(animal);

      await service.create(
        createDto({
          breed: 'mixed',
          sex: AnimalSex.FEMALE,
          status: AnimalStatus.ADMITTED,
          birthDate: '2025-06-01',
          profilePhotoMediaId: 'media-id',
        }),
        'user-id',
      );

      expect(mediaService.findById).toHaveBeenCalledWith('media-id');
      expect(animalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          breed: 'mixed',
          sex: AnimalSex.FEMALE,
          birthDate: new Date('2025-06-01'),
          profilePhotoMediaId: 'media-id',
        }),
      );
    });

    it('throws ResourceNotFoundException when the profile photo media asset does not exist', async () => {
      mediaService.findById.mockResolvedValue(null);

      await expect(
        service.create(createDto({ profilePhotoMediaId: 'missing-media-id' }), 'user-id'),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(animalRepository.create).not.toHaveBeenCalled();
    });
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
