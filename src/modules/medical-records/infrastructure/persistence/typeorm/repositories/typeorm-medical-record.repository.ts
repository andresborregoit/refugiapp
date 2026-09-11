import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../../../modules/media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../../modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { CreateMedicalRecord } from '../../../../domain/entities/create-medical-record.entity';
import { MedicalRecord } from '../../../../domain/entities/medical-record.entity';
import { UpdateMedicalRecord } from '../../../../domain/entities/update-medical-record.entity';
import {
  MedicalRecordListQuery,
  MedicalRecordRepository,
  PaginatedMedicalRecords,
} from '../../../../domain/repositories/medical-record.repository';
import { MedicalRecordChangeType } from '../../../../domain/enums/medical-record-change-type.enum';
import { MedicalRecordOrmEntity } from '../entities/medical-record.orm-entity';
import { MedicalRecordChangeOrmEntity } from '../entities/medical-record-change.orm-entity';

@Injectable()
export class TypeOrmMedicalRecordRepository implements MedicalRecordRepository {
  constructor(
    @InjectRepository(MedicalRecordOrmEntity)
    private readonly repository: Repository<MedicalRecordOrmEntity>,
    @InjectRepository(MediaAssetOrmEntity)
    private readonly mediaAssetRepository: Repository<MediaAssetOrmEntity>,
    @InjectRepository(MedicalRecordChangeOrmEntity)
    private readonly changeRepository: Repository<MedicalRecordChangeOrmEntity>,
  ) {}

  async findById(id: string): Promise<MedicalRecord | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findByIdWithDeleted(id: string): Promise<MedicalRecord | null> {
    const entity = await this.repository.findOne({ where: { id }, withDeleted: true });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: MedicalRecordListQuery): Promise<PaginatedMedicalRecords> {
    const where: FindOptionsWhere<MedicalRecordOrmEntity> = {};

    if (query.animalId) {
      where.animalId = query.animalId;
    }

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

  async update(id: string, input: UpdateMedicalRecord): Promise<MedicalRecord | null> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(MedicalRecordOrmEntity, { where: { id } });

      if (!entity) {
        return null;
      }

      const previousValues: Record<string, unknown> = {};

      if (input.recordType !== undefined) {
        previousValues.recordType = entity.recordType;
        entity.recordType = input.recordType;
      }

      if (input.title !== undefined) {
        previousValues.title = entity.title;
        entity.title = input.title;
      }

      if (input.occurredAt !== undefined) {
        previousValues.occurredAt = entity.occurredAt;
        entity.occurredAt = input.occurredAt;
      }

      if (input.veterinarianId !== undefined) {
        previousValues.veterinarianId = entity.veterinarianId ?? null;
        entity.veterinarianId = input.veterinarianId;
      }

      if (input.diagnosis !== undefined) {
        previousValues.diagnosis = entity.diagnosis ?? null;
        entity.diagnosis = input.diagnosis;
      }

      if (input.treatment !== undefined) {
        previousValues.treatment = entity.treatment ?? null;
        entity.treatment = input.treatment;
      }

      if (input.notes !== undefined) {
        previousValues.notes = entity.notes ?? null;
        entity.notes = input.notes;
      }

      const saved = await manager.save(MedicalRecordOrmEntity, entity);

      await manager.save(
        manager.create(MedicalRecordChangeOrmEntity, {
          medicalRecordId: id,
          changedByUserId: input.changedByUserId,
          changeType: MedicalRecordChangeType.UPDATE,
          previousValues,
          changedAt: new Date(),
        }),
      );

      return this.toDomain(saved);
    });
  }

  async softDelete(id: string, changedByUserId: string): Promise<void> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(MedicalRecordOrmEntity, { where: { id } });

      if (!entity) {
        return;
      }

      const previousValues: Record<string, unknown> = {
        recordType: entity.recordType,
        title: entity.title,
        occurredAt: entity.occurredAt,
        veterinarianId: entity.veterinarianId ?? null,
        diagnosis: entity.diagnosis ?? null,
        treatment: entity.treatment ?? null,
        notes: entity.notes ?? null,
      };

      await manager.softDelete(MedicalRecordOrmEntity, id);

      await manager.save(
        manager.create(MedicalRecordChangeOrmEntity, {
          medicalRecordId: id,
          changedByUserId,
          changeType: MedicalRecordChangeType.SOFT_DELETE,
          previousValues,
          changedAt: new Date(),
        }),
      );
    });
  }

  async restore(id: string, changedByUserId: string): Promise<MedicalRecord | null> {
    return this.repository.manager.transaction(async (manager) => {
      const entity = await manager.findOne(MedicalRecordOrmEntity, {
        where: { id },
        withDeleted: true,
      });

      if (!entity) {
        return null;
      }

      entity.deletedAt = null;
      const saved = await manager.save(MedicalRecordOrmEntity, entity);

      await manager.save(
        manager.create(MedicalRecordChangeOrmEntity, {
          medicalRecordId: id,
          changedByUserId,
          changeType: MedicalRecordChangeType.RESTORE,
          previousValues: { deletedAt: entity.deletedAt },
          changedAt: new Date(),
        }),
      );

      return this.toDomain(saved);
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
      entity.updatedAt,
      entity.deletedAt ?? null,
    );
  }
}
