import { CreateMedicalRecord } from '../entities/create-medical-record.entity';
import { MedicalRecord } from '../entities/medical-record.entity';
import { MedicalRecordType } from '../enums/medical-record-type.enum';

export const MEDICAL_RECORD_REPOSITORY = Symbol('MEDICAL_RECORD_REPOSITORY');

export interface MedicalRecordListQuery {
  animalId: string;
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

export interface MedicalRecordRepository {
  findById(id: string): Promise<MedicalRecord | null>;
  findMany(query: MedicalRecordListQuery): Promise<PaginatedMedicalRecords>;
  create(input: CreateMedicalRecord): Promise<MedicalRecord>;
}
