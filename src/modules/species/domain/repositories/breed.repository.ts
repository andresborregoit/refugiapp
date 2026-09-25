import { Breed } from '../entities/breed.entity';

export const BREED_REPOSITORY = Symbol('BREED_REPOSITORY');

export interface BreedRepository {
  findActiveBySpeciesIdOrdered(speciesId: string): Promise<Breed[]>;
}