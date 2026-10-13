import { Animal } from '../entities/animal.entity';
import { ChangeAnimalStatus } from '../entities/change-animal-status.entity';
import { CreateAnimal } from '../entities/create-animal.entity';
import { UpdateAnimal } from '../entities/update-animal.entity';
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
  update(id: string, input: UpdateAnimal): Promise<Animal | null>;
  findById(id: string): Promise<Animal | null>;
  findMany(query: AnimalListQuery): Promise<PaginatedAnimals>;
  changeStatus(input: ChangeAnimalStatus): Promise<Animal>;
  /**
   * Counts the animal's `pending` care tasks. Completed and cancelled tasks do
   * not block a deletion, so only `pending` rows are taken into account.
   */
  countPendingCareTasks(animalId: string): Promise<number>;
  /**
   * Counts every historical record that must survive the animal's removal:
   * clinical records, expenses and adoption applications/adoptions. The count
   * includes soft-deleted rows, so removing an animal never hides them.
   */
  countHistoricalRecords(animalId: string): Promise<number>;
  /**
   * Applies a soft delete (`deletedAt`) and detaches the profile photo asset so
   * the orphan purge policy can reclaim it, both inside a single transaction.
   * Returns `true` when a row was affected, `false` when the animal does not
   * exist.
   */
  softDelete(id: string): Promise<boolean>;
}
