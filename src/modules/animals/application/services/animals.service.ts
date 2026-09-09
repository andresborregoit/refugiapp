import { Inject, Injectable } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { MediaService } from '../../../media/application/services/media.service';
import {
  ANIMAL_REPOSITORY,
  AnimalListQuery,
  AnimalRepository,
  PaginatedAnimals,
} from '../../domain/repositories/animal.repository';
import { Animal } from '../../domain/entities/animal.entity';
import { CreateAnimal } from '../../domain/entities/create-animal.entity';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';
import { CreateAnimalDto } from '../../interfaces/dto/create-animal.dto';

@Injectable()
export class AnimalsService {
  constructor(
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    private readonly mediaService: MediaService,
  ) {}

  async create(dto: CreateAnimalDto, createdByUserId: string): Promise<Animal> {
    const profilePhotoMediaId = dto.profilePhotoMediaId ?? null;

    if (profilePhotoMediaId) {
      const mediaAsset = await this.mediaService.findById(profilePhotoMediaId);

      if (!mediaAsset) {
        throw new ResourceNotFoundException('MediaAsset', profilePhotoMediaId);
      }
    }

    const input = new CreateAnimal(
      dto.name.trim(),
      dto.species.trim(),
      dto.breed?.trim() || null,
      dto.sex ?? AnimalSex.UNKNOWN,
      dto.status ?? AnimalStatus.ADMITTED,
      new Date(dto.intakeDate),
      dto.birthDate ? new Date(dto.birthDate) : null,
      null,
      profilePhotoMediaId,
      createdByUserId,
    );

    return this.animalRepository.create(input);
  }

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
