import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../../../modules/media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../../modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { CreateMedicalRecord } from '../../../../domain/entities/create-medical-record.entity';
import { MedicalRecord } from '../../../../domain/entities/medical-record.entity';
import {
  MedicalRecordListQuery,
  MedicalRecordRepository,
  PaginatedMedicalRecords,
} from '../../../../domain/repositories/medical-record.repository';
import { MedicalRecordOrmEntity } from '../entities/medical-record.orm-entity';

@Injectable()
export class TypeOrmMedicalRecordRepository implements MedicalRecordRepository {
  constructor(
    @InjectRepository(MedicalRecordOrmEntity)
    private readonly repository: Repository<MedicalRecordOrmEntity>,
    @InjectRepository(MediaAssetOrmEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetOrmEntity>,
  ) {}

  async findById(id: string): Promise<MedicalRecord | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: MedicalRecordListQuery): Promise<PaginatedMedicalRecords> {
    const where: FindOptionsWhere<MedicalRecordOrmEntity> = {
      animalId: query.animalId,
    };

    if (query.recordType) {
      where.recordType = query.recordType;
    }

    if (query.from && query.to) {
      where.occurredAt = Between(query.from, query.to);
    } else if (query.from) {
      where.occurredAt = MoreThanOrEqual(query.from);
    } else if (query.to) {
      where.occurredAt = LessThanOrEqual(query.to);
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { occurredAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async create(input: CreateMedicalRecord): Promise<MedicalRecord> {
    return this.repository.manager.transaction(async (manager) => {
      const record = await manager.save(
        manager.create(MedicalRecordOrmEntity, {
          animalId: input.animalId,
          recordType: input.recordType,
          title: input.title,
          occurredAt: input.occurredAt,
          veterinarianId: input.veterinarianId,
          diagnosis: input.diagnosis,
          treatment: input.treatment,
          notes: input.notes,
        }),
      );

      if (input.attachmentMediaIds.length > 0) {
        await manager.update(
          MediaAssetOrmEntity,
          { id: In(input.attachmentMediaIds) },
          { ownerType: MediaOwnerType.MEDICAL_RECORD, ownerId: record.id },
        );
      }

      return this.toDomain(record);
    });
  }

  private toDomain(entity: MedicalRecordOrmEntity): MedicalRecord {
    return new MedicalRecord(
      entity.id,
      entity.animalId,
      entity.recordType,
      entity.title,
      entity.occurredAt,
      entity.veterinarianId ?? null,
      entity.diagnosis ?? null,
      entity.treatment ?? null,
      entity.notes ?? null,
      entity.createdAt,
    );
  }
}
