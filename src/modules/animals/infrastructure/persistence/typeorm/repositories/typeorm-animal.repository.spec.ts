import { Repository } from 'typeorm';
import { AnimalSex } from '../../../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../../domain/enums/animal-status.enum';
import { AnimalOrmEntity } from '../entities/animal.orm-entity';
import { TypeOrmAnimalRepository } from './typeorm-animal.repository';

describe('TypeOrmAnimalRepository', () => {
  let repository: jest.Mocked<Pick<Repository<AnimalOrmEntity>, 'findAndCount' | 'findOne'>>;
  let animalRepository: TypeOrmAnimalRepository;

  beforeEach(() => {
    repository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    animalRepository = new TypeOrmAnimalRepository(
      repository as unknown as Repository<AnimalOrmEntity>,
    );
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
});
