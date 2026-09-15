import { Animal } from '../entities/animal.entity';

export const ANIMAL_REPOSITORY = Symbol('ANIMAL_REPOSITORY');

export interface AnimalRepository {
  findById(id: string): Promise<Animal | null>;
}
