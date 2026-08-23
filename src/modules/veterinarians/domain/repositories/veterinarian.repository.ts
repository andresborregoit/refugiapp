import { Veterinarian } from '../entities/veterinarian.entity';

export const VETERINARIAN_REPOSITORY = Symbol('VETERINARIAN_REPOSITORY');

export interface VeterinarianRepository {
  findById(id: string): Promise<Veterinarian | null>;
}
