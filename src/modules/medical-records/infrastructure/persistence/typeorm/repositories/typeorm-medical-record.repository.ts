import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicalRecord } from '../../../../domain/entities/medical-record.entity';
import { MedicalRecordRepository } from '../../../../domain/repositories/medical-record.repository';
import { MedicalRecordOrmEntity } from '../entities/medical-record.orm-entity';

@Injectable()
export class TypeOrmMedicalRecordRepository implements MedicalRecordRepository {
  constructor(
    @InjectRepository(MedicalRecordOrmEntity)
    private readonly repository: Repository<MedicalRecordOrmEntity>,
  ) {}

  async findById(id: string): Promise<MedicalRecord | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: MedicalRecordOrmEntity): MedicalRecord {
    return new MedicalRecord(
      entity.id,
      entity.animalId,
      entity.recordType,
      entity.title,
      entity.occurredAt,
      entity.veterinarianId,
    );
  }
}
