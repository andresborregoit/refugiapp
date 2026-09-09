import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { MediaService } from '../../../media/application/services/media.service';
import { ChangeAnimalStatus } from '../../domain/entities/change-animal-status.entity';
import { CreateAnimal } from '../../domain/entities/create-animal.entity';
import { Animal } from '../../domain/entities/animal.entity';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';
import {
  ANIMAL_REPOSITORY,
  AnimalListQuery,
  AnimalRepository,
  PaginatedAnimals,
} from '../../domain/repositories/animal.repository';
import { resolveEventOccurredAt } from '../../domain/services/animal-event-date';
import { canTransitionStatus } from '../../domain/services/animal-status-transitions';
import { CreateAnimalDto } from '../../interfaces/dto/create-animal.dto';
import { mapDomainExceptionToBadRequest } from '../mappers/domain-to-http-exception.mapper';

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

  async changeStatus(
    animalId: string,
    status: AnimalStatus,
    actorId: string,
    occurredAt?: string,
  ): Promise<Animal> {
    const animal = await this.animalRepository.findById(animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', animalId);
    }

    if (animal.status === status) {
      throw new ResourceConflictException(
        'The animal is already in the requested status.',
        'STATUS_UNCHANGED',
      );
    }

    if (!canTransitionStatus(animal.status, status)) {
      throw new ResourceConflictException(
        `Transition from ${animal.status} to ${status} is not allowed.`,
        'INVALID_STATUS_TRANSITION',
      );
    }

    let resolvedOccurredAt: Date;

    try {
      resolvedOccurredAt = resolveEventOccurredAt(occurredAt, animal.intakeDate, new Date());
    } catch (error) {
      if (error instanceof DomainException) {
        throw mapDomainExceptionToBadRequest(error);
      }

      throw error;
    }

    const input = new ChangeAnimalStatus(
      animalId,
      animal.status,
      status,
      resolvedOccurredAt,
      actorId,
    );

    return this.animalRepository.changeStatus(input);
  }
}
