import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { Breed } from '../../domain/entities/breed.entity';
import { Species } from '../../domain/entities/species.entity';
import { BREED_REPOSITORY, BreedRepository } from '../../domain/repositories/breed.repository';
import { SPECIES_REPOSITORY, SpeciesRepository } from '../../domain/repositories/species.repository';

@Injectable()
export class SpeciesService {
  constructor(
    @Inject(SPECIES_REPOSITORY)
    private readonly speciesRepository: SpeciesRepository,
    @Inject(BREED_REPOSITORY)
    private readonly breedRepository: BreedRepository,
  ) {}

  async listSpecies(): Promise<Species[]> {
    return this.speciesRepository.findActiveOrdered();
  }

  async listBreedsBySpeciesId(speciesId: string): Promise<Breed[]> {
    const species = await this.speciesRepository.findById(speciesId);

    if (!species || !species.isActive) {
      throw new ResourceNotFoundException('Species', speciesId);
    }

    return this.breedRepository.findActiveBySpeciesIdOrdered(speciesId);
  }
}