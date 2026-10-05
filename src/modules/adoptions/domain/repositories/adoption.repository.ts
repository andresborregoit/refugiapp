import { Adopter } from '../entities/adopter.entity';
import { Adoption } from '../entities/adoption.entity';
import { AdoptionApplication } from '../entities/adoption-application.entity';

export const ADOPTION_REPOSITORY = Symbol('ADOPTION_REPOSITORY');

export interface CreateAdopter {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
}

export interface CreateAdoptionApplication {
  animalId: string;
  adopterId: string;
  submittedAt: Date;
  createdByUserId: string;
}

export interface ListPageQuery {
  page: number;
  limit: number;
}

export interface PaginatedAdoptionApplications extends ListPageQuery {
  items: AdoptionApplication[];
  total: number;
}

export interface PaginatedAdoptions extends ListPageQuery {
  items: Adoption[];
  total: number;
}

export type CompleteAdoptionResult =
  | { status: 'completed'; adoption: Adoption }
  | { status: 'application_not_found' }
  | { status: 'application_not_pending' }
  | { status: 'animal_not_found' }
  | { status: 'animal_not_available' };

export interface AdoptionRepository {
  createAdopter(input: CreateAdopter): Promise<Adopter | null>;
  findAdopterById(id: string): Promise<Adopter | null>;
  findAdopterByEmail(email: string): Promise<Adopter | null>;
  createApplication(input: CreateAdoptionApplication): Promise<AdoptionApplication | null>;
  findApplicationById(id: string): Promise<AdoptionApplication | null>;
  listApplicationsByAnimal(
    animalId: string,
    query: ListPageQuery,
  ): Promise<PaginatedAdoptionApplications>;
  completeAdoption(
    applicationId: string,
    adoptedAt: Date,
    responsibleUserId: string,
  ): Promise<CompleteAdoptionResult>;
  listAdoptionsByAnimal(animalId: string, query: ListPageQuery): Promise<PaginatedAdoptions>;
}
