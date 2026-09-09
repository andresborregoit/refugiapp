import { Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { mapDomainExceptionToBadRequest } from '../../../../common/mappers/domain-to-http-exception.mapper';
import { MEDIA_ASSET_REPOSITORY, MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { VETERINARIAN_REPOSITORY, VeterinarianRepository } from '../../../veterinarians/domain/repositories/veterinarian.repository';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { CreateMedicalRecord } from '../../domain/entities/create-medical-record.entity';
import { MedicalRecord } from '../../domain/entities/medical-record.entity';
import {
  MEDICAL_RECORD_REPOSITORY,
  MedicalRecordRepository,
} from '../../domain/repositories/medical-record.repository';
import { validateRecordOccurredAt } from '../../domain/services/medical-record-date';
import { CreateMedicalRecordDto } from '../../interfaces/dto/create-medical-record.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @Inject(MEDICAL_RECORD_REPOSITORY)
    private readonly medicalRecordRepository: MedicalRecordRepository,
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    @Inject(VETERINARIAN_REPOSITORY)
    private readonly veterinarianRepository: VeterinarianRepository,
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: MediaAssetRepository,
  ) {}

  async create(dto: CreateMedicalRecordDto): Promise<MedicalRecord> {
    const animal = await this.animalRepository.findById(dto.animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', dto.animalId);
    }

    if (dto.veterinarianId) {
      const vet = await this.veterinarianRepository.findById(dto.veterinarianId);

      if (!vet) {
        throw new ResourceNotFoundException('Veterinarian', dto.veterinarianId);
      }

      if (!vet.isActive) {
        throw new ResourceConflictException(
          'The veterinarian is inactive and cannot be linked to new records.',
          'VETERINARIAN_INACTIVE',
        );
      }
    }

    const occurredAt = new Date(dto.occurredAt);

    try {
      validateRecordOccurredAt(occurredAt, new Date(animal.intakeDate), new Date());
    } catch (error) {
      if (error instanceof DomainException) {
        throw mapDomainExceptionToBadRequest(error);
      }

      throw error;
    }

    const attachmentMediaIds = dto.attachmentMediaIds ?? [];

    for (const mediaId of attachmentMediaIds) {
      const asset = await this.mediaAssetRepository.findById(mediaId);

      if (!asset) {
        throw new ResourceNotFoundException('MediaAsset', mediaId);
      }
    }

    const input = new CreateMedicalRecord(
      dto.animalId,
      dto.recordType,
      dto.title.trim(),
      occurredAt,
      dto.veterinarianId ?? null,
      dto.diagnosis?.trim() || null,
      dto.treatment?.trim() || null,
      dto.notes?.trim() || null,
      attachmentMediaIds,
    );

    return this.medicalRecordRepository.create(input);
  }

  findById(id: string) {
    return this.medicalRecordRepository.findById(id);
  }
}
