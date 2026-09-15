import { CreateVeterinarian } from '../entities/create-veterinarian.entity';
import { UpdateVeterinarian } from '../entities/update-veterinarian.entity';
import { Veterinarian } from '../entities/veterinarian.entity';

export const VETERINARIAN_REPOSITORY = Symbol('VETERINARIAN_REPOSITORY');

export interface VeterinarianListQuery {
  page: number;
  limit: number;
  name?: string;
  licenseNumber?: string;
  isActive?: boolean;
}

export interface PaginatedVeterinarians {
  items: Veterinarian[];
  page: number;
  limit: number;
  total: number;
}

export interface VeterinarianRepository {
  create(input: CreateVeterinarian): Promise<Veterinarian>;
  findById(id: string): Promise<Veterinarian | null>;
  findByLicenseNumber(licenseNumber: string): Promise<Veterinarian | null>;
  findByUserId(userId: string): Promise<Veterinarian | null>;
  findMany(query: VeterinarianListQuery): Promise<PaginatedVeterinarians>;
  update(id: string, input: UpdateVeterinarian): Promise<Veterinarian | null>;
  deactivate(id: string): Promise<Veterinarian | null>;
}
