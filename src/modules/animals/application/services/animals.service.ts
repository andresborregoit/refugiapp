import { Inject, Injectable } from '@nestjs/common';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../domain/repositories/animal.repository';

@Injectable()
export class AnimalsService {
  constructor(
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
  ) {}

  findById(id: string) {
    return this.animalRepository.findById(id);
  }
}
