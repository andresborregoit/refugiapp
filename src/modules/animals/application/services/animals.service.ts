import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import {
  ANIMAL_REPOSITORY,
  AnimalListQuery,
  AnimalRepository,
  PaginatedAnimals,
} from '../../domain/repositories/animal.repository';
import { Animal } from '../../domain/entities/animal.entity';

@Injectable()
export class AnimalsService {
  constructor(
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
  ) {}

  async list(query: AnimalListQuery): Promise<PaginatedAnimals> {
    return this.animalRepository.findMany(query);
  }

  async findById(id: string): Promise<Animal> {
    const animal = await this.animalRepository.findById(id);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', id);
    }

    return animal;
  }
}
