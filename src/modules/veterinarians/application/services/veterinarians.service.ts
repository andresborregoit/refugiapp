import { Inject, Injectable } from '@nestjs/common';
import {
  VETERINARIAN_REPOSITORY,
  VeterinarianRepository,
} from '../../domain/repositories/veterinarian.repository';

@Injectable()
export class VeterinariansService {
  constructor(
    @Inject(VETERINARIAN_REPOSITORY)
    private readonly veterinarianRepository: VeterinarianRepository,
  ) {}

  findById(id: string) {
    return this.veterinarianRepository.findById(id);
  }
}
