import { MedicalRecord } from '../entities/medical-record.entity';

export const MEDICAL_RECORD_REPOSITORY = Symbol('MEDICAL_RECORD_REPOSITORY');

export interface MedicalRecordRepository {
  findById(id: string): Promise<MedicalRecord | null>;
}
