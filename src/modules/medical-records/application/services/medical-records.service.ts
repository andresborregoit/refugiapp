import { Inject, Injectable } from '@nestjs/common';
import {
  MEDICAL_RECORD_REPOSITORY,
  MedicalRecordRepository,
} from '../../domain/repositories/medical-record.repository';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @Inject(MEDICAL_RECORD_REPOSITORY)
    private readonly medicalRecordRepository: MedicalRecordRepository,
  ) {}

  findById(id: string) {
    return this.medicalRecordRepository.findById(id);
  }
}
