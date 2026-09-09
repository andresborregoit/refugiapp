import { Animal } from '../entities/animal.entity';
import { CreateAnimal } from '../entities/create-animal.entity';
import { AnimalSex } from '../enums/animal-sex.enum';
import { AnimalStatus } from '../enums/animal-status.enum';

export const ANIMAL_REPOSITORY = Symbol('ANIMAL_REPOSITORY');

export interface AnimalListQuery {
  page: number;
  limit: number;
  status?: AnimalStatus;
  species?: string;
  sex?: AnimalSex;
  name?: string;
}

export interface PaginatedAnimals {
  items: Animal[];
  page: number;
  limit: number;
  total: number;
}

export interface AnimalRepository {
  create(input: CreateAnimal): Promise<Animal>;
  findById(id: string): Promise<Animal | null>;
  findMany(query: AnimalListQuery): Promise<PaginatedAnimals>;
}
