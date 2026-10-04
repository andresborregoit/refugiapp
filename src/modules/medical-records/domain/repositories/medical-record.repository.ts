import { CreateMedicalRecord } from '../entities/create-medical-record.entity';
import { MedicalRecord } from '../entities/medical-record.entity';
import { MedicalRecordChange } from '../entities/medical-record-change.entity';
import { UpdateMedicalRecord } from '../entities/update-medical-record.entity';
import { MedicalRecordChangeType } from '../enums/medical-record-change-type.enum';
import { MedicalRecordType } from '../enums/medical-record-type.enum';

export const MEDICAL_RECORD_REPOSITORY = Symbol('MEDICAL_RECORD_REPOSITORY');

export interface MedicalRecordListQuery {
  animalId?: string;
  page: number;
  limit: number;
  recordType?: MedicalRecordType;
  from?: Date;
  to?: Date;
}

export interface PaginatedMedicalRecords {
  items: MedicalRecord[];
  page: number;
  limit: number;
  total: number;
}

export interface MedicalRecordChangesQuery {
  medicalRecordId: string;
  page: number;
  limit: number;
  changeType?: MedicalRecordChangeType;
  changedByUserId?: string;
  from?: Date;
  to?: Date;
}

export interface PaginatedMedicalRecordChanges {
  items: MedicalRecordChange[];
  page: number;
  limit: number;
  total: number;
}

export interface MedicalRecordRepository {
  findById(id: string): Promise<MedicalRecord | null>;
  findByIdWithDeleted(id: string): Promise<MedicalRecord | null>;
  findMany(query: MedicalRecordListQuery): Promise<PaginatedMedicalRecords>;
  findChanges(query: MedicalRecordChangesQuery): Promise<PaginatedMedicalRecordChanges>;
  create(input: CreateMedicalRecord): Promise<MedicalRecord>;
  update(id: string, input: UpdateMedicalRecord): Promise<MedicalRecord | null>;
  softDelete(id: string, changedByUserId: string): Promise<void>;
  restore(id: string, changedByUserId: string): Promise<MedicalRecord | null>;
}
