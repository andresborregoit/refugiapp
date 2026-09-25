import { Repository } from 'typeorm';
import { SpeciesOrmEntity } from '../entities/species.orm-entity';
import { TypeOrmSpeciesRepository } from './typeorm-species.repository';

describe('TypeOrmSpeciesRepository', () => {
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let speciesRepository: TypeOrmSpeciesRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    speciesRepository = new TypeOrmSpeciesRepository(
      repository as unknown as Repository<SpeciesOrmEntity>,
    );
  });

  it('filters active species with stable ordering by sortOrder and id', async () => {
    repository.find.mockResolvedValue([createEntity()]);

    const result = await speciesRepository.findActiveOrdered();

    expect(repository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    expect(result).toMatchObject([
      {
        id: 'species-id',
        slug: 'dog',
        labelEs: 'Perro',
        isActive: true,
        sortOrder: 10,
      },
    ]);
  });

  it('maps a species by id', async () => {
    repository.findOne.mockResolvedValue(createEntity());

    await expect(speciesRepository.findById('species-id')).resolves.toMatchObject({
      id: 'species-id',
      slug: 'dog',
      labelEs: 'Perro',
      isActive: true,
      sortOrder: 10,
    });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'species-id' } });
  });

  it('returns null when the species does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(speciesRepository.findById('missing-id')).resolves.toBeNull();
  });

  function createEntity(): SpeciesOrmEntity {
    return Object.assign(new SpeciesOrmEntity(), {
      id: 'species-id',
      slug: 'dog',
      labelEs: 'Perro',
      isActive: true,
      sortOrder: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
  }
});