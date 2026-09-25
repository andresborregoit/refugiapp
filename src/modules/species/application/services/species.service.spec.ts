import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { Breed } from '../../domain/entities/breed.entity';
import { Species } from '../../domain/entities/species.entity';
import { BreedRepository } from '../../domain/repositories/breed.repository';
import { SpeciesRepository } from '../../domain/repositories/species.repository';
import { SpeciesService } from './species.service';

describe('SpeciesService', () => {
  const speciesRepository = {
    findActiveOrdered: jest.fn(),
    findById: jest.fn(),
  };
  const breedRepository = {
    findActiveBySpeciesIdOrdered: jest.fn(),
  };
  let service: SpeciesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SpeciesService(
      speciesRepository as unknown as SpeciesRepository,
      breedRepository as unknown as BreedRepository,
    );
  });

  it('returns active species in catalog order', async () => {
    speciesRepository.findActiveOrdered.mockResolvedValue([createSpecies()]);

    await expect(service.listSpecies()).resolves.toEqual([createSpecies()]);
    expect(speciesRepository.findActiveOrdered).toHaveBeenCalledTimes(1);
  });

  it('returns breeds for an existing active species', async () => {
    speciesRepository.findById.mockResolvedValue(createSpecies());
    breedRepository.findActiveBySpeciesIdOrdered.mockResolvedValue([createBreed()]);

    await expect(service.listBreedsBySpeciesId('species-id')).resolves.toEqual([createBreed()]);
    expect(breedRepository.findActiveBySpeciesIdOrdered).toHaveBeenCalledWith('species-id');
  });

  it('throws ResourceNotFoundException when the species does not exist', async () => {
    speciesRepository.findById.mockResolvedValue(null);

    await expect(service.listBreedsBySpeciesId('missing-id')).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(breedRepository.findActiveBySpeciesIdOrdered).not.toHaveBeenCalled();
  });

  it('throws ResourceNotFoundException when the species is inactive', async () => {
    speciesRepository.findById.mockResolvedValue(createSpecies({ isActive: false }));

    await expect(service.listBreedsBySpeciesId('species-id')).rejects.toThrow(
      ResourceNotFoundException,
    );
    expect(breedRepository.findActiveBySpeciesIdOrdered).not.toHaveBeenCalled();
  });

  function createSpecies(overrides: Partial<Species> = {}): Species {
    return Object.assign(
      new Species('species-id', 'dog', 'Perro', true, 10),
      overrides,
    );
  }

  function createBreed(): Breed {
    return new Breed('breed-id', 'species-id', 'mestizo', 'Mestizo', true);
  }
});