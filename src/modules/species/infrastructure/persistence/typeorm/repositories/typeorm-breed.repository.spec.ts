import { Repository } from 'typeorm';
import { BreedOrmEntity } from '../entities/breed.orm-entity';
import { TypeOrmBreedRepository } from './typeorm-breed.repository';

describe('TypeOrmBreedRepository', () => {
  let repository: {
    find: jest.Mock;
  };
  let breedRepository: TypeOrmBreedRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      find: jest.fn(),
    };
    breedRepository = new TypeOrmBreedRepository(
      repository as unknown as Repository<BreedOrmEntity>,
    );
  });

  it('filters active breeds by species with stable ordering by labelEs and id', async () => {
    repository.find.mockResolvedValue([createEntity()]);

    const result = await breedRepository.findActiveBySpeciesIdOrdered('species-id');

    expect(repository.find).toHaveBeenCalledWith({
      where: { speciesId: 'species-id', isActive: true },
      order: { labelEs: 'ASC', id: 'ASC' },
    });
    expect(result).toMatchObject([
      {
        id: 'breed-id',
        speciesId: 'species-id',
        slug: 'mestizo',
        labelEs: 'Mestizo',
        isActive: true,
      },
    ]);
  });

  it('returns an empty list when the species has no breeds', async () => {
    repository.find.mockResolvedValue([]);

    await expect(breedRepository.findActiveBySpeciesIdOrdered('species-id')).resolves.toEqual([]);
  });

  function createEntity(): BreedOrmEntity {
    return Object.assign(new BreedOrmEntity(), {
      id: 'breed-id',
      speciesId: 'species-id',
      slug: 'mestizo',
      labelEs: 'Mestizo',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
});