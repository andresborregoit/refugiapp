import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { mapDomainExceptionToBadRequest } from '../../../../common/mappers/domain-to-http-exception.mapper';
import { MEDIA_ASSET_REPOSITORY, MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { VETERINARIAN_REPOSITORY, VeterinarianRepository } from '../../../veterinarians/domain/repositories/veterinarian.repository';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { CreateMedicalRecord } from '../../domain/entities/create-medical-record.entity';
import { MedicalRecord } from '../../domain/entities/medical-record.entity';
import { UpdateMedicalRecord } from '../../domain/entities/update-medical-record.entity';
import {
  MedicalRecordListQuery,
  MEDICAL_RECORD_REPOSITORY,
  MedicalRecordRepository,
  PaginatedMedicalRecords,
} from '../../domain/repositories/medical-record.repository';
import { validateRecordOccurredAt } from '../../domain/services/medical-record-date';
import { CreateMedicalRecordDto } from '../../interfaces/dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from '../../interfaces/dto/list-medical-records.query.dto';
import { UpdateMedicalRecordDto } from '../../interfaces/dto/update-medical-record.dto';

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

  async update(id: string, dto: UpdateMedicalRecordDto, actorId: string): Promise<MedicalRecord> {
    const record = await this.medicalRecordRepository.findById(id);

    if (!record) {
      throw new ResourceNotFoundException('MedicalRecord', id);
    }

    if (dto.veterinarianId !== undefined && dto.veterinarianId !== null) {
      const vet = await this.veterinarianRepository.findById(dto.veterinarianId);

      if (!vet) {
        throw new ResourceNotFoundException('Veterinarian', dto.veterinarianId);
      }

      if (!vet.isActive) {
        throw new ResourceConflictException(
          'The veterinarian is inactive and cannot be linked to records.',
          'VETERINARIAN_INACTIVE',
        );
      }
    }

    if (dto.occurredAt !== undefined) {
      const animal = await this.animalRepository.findById(record.animalId);

      if (!animal) {
        throw new ResourceNotFoundException('Animal', record.animalId);
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
    }

    const input = new UpdateMedicalRecord(
      actorId,
      dto.recordType,
      dto.title?.trim(),
      dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      dto.veterinarianId,
      dto.diagnosis?.trim() || null,
      dto.treatment?.trim() || null,
      dto.notes?.trim() || null,
    );

    const updated = await this.medicalRecordRepository.update(id, input);

    if (!updated) {
      throw new ResourceNotFoundException('MedicalRecord', id);
    }

    return updated;
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    const record = await this.medicalRecordRepository.findById(id);

    if (!record) {
      throw new ResourceNotFoundException('MedicalRecord', id);
    }

    await this.medicalRecordRepository.softDelete(id, actorId);
  }

  async restore(id: string, actorId: string): Promise<MedicalRecord> {
    const record = await this.medicalRecordRepository.findByIdWithDeleted(id);

    if (!record) {
      throw new ResourceNotFoundException('MedicalRecord', id);
    }

    if (!record.deletedAt) {
      throw new ResourceConflictException(
        'The medical record is not deleted and cannot be restored.',
        'RECORD_NOT_DELETED',
      );
    }

    const restored = await this.medicalRecordRepository.restore(id, actorId);

    if (!restored) {
      throw new ResourceNotFoundException('MedicalRecord', id);
    }

    return restored;
  }

  async listByAnimal(
    animalId: string,
    query: ListMedicalRecordsQueryDto,
  ): Promise<PaginatedMedicalRecords> {
    const animal = await this.animalRepository.findById(animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', animalId);
    }

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'from must be less than or equal to to.',
      });
    }

    const repositoryQuery: MedicalRecordListQuery = {
      animalId,
      page: query.page,
      limit: query.limit,
      recordType: query.recordType,
      from,
      to,
    };

    return this.medicalRecordRepository.findMany(repositoryQuery);
  }

  async list(query: ListMedicalRecordsQueryDto): Promise<PaginatedMedicalRecords> {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException({
        code: 'INVALID_DATE_RANGE',
        message: 'from must be less than or equal to to.',
      });
    }

    const repositoryQuery: MedicalRecordListQuery = {
      page: query.page,
      limit: query.limit,
      recordType: query.recordType,
      from,
      to,
    };

    return this.medicalRecordRepository.findMany(repositoryQuery);
  }
}
