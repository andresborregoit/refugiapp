import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../../users/domain/entities/user.entity';
import { CreateVeterinarian } from '../entities/create-veterinarian.entity';
import { CreateVeterinarianUser } from '../entities/create-veterinarian-user.entity';
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

export interface VeterinarianWithUser {
  veterinarian: Veterinarian;
  user: User | null;
}

export interface CreateVeterinarianWithUserInput {
  veterinarian: CreateVeterinarian;
  createUser?: CreateVeterinarianUser;
  linkUserId?: string;
  ensureRole?: UserRole;
}

export interface VeterinarianRepository {
  create(input: CreateVeterinarian): Promise<Veterinarian>;
  createWithUser(input: CreateVeterinarianWithUserInput): Promise<VeterinarianWithUser>;
  findById(id: string): Promise<Veterinarian | null>;
  findByLicenseNumber(licenseNumber: string): Promise<Veterinarian | null>;
  findByUserId(userId: string): Promise<Veterinarian | null>;
  findMany(query: VeterinarianListQuery): Promise<PaginatedVeterinarians>;
  update(id: string, input: UpdateVeterinarian): Promise<Veterinarian | null>;
  deactivate(id: string): Promise<Veterinarian | null>;
  reactivate(id: string): Promise<Veterinarian | null>;
  /**
   * Counts every clinical record linked to the veterinarian, including
   * soft-deleted ones: the clinical history must survive a professional's
   * removal, so the count is never filtered by `deletedAt`.
   */
  countMedicalRecords(veterinarianId: string): Promise<number>;
  /**
   * Physically removes the veterinarian row. Veterinarians do not use soft
   * delete to keep their linkage intact; callers must guarantee there is no
   * clinical history before invoking it.
   */
  delete(id: string): Promise<boolean>;
}
