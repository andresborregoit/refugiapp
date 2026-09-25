import { Species } from '../entities/species.entity';

export const SPECIES_REPOSITORY = Symbol('SPECIES_REPOSITORY');

export interface SpeciesRepository {
  findActiveOrdered(): Promise<Species[]>;
  findById(id: string): Promise<Species | null>;
}