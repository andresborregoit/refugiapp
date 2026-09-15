import { MedicalRecordType } from '../enums/medical-record-type.enum';

export class MedicalRecord {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly recordType: MedicalRecordType,
    public readonly title: string,
    public readonly occurredAt: Date,
    public readonly veterinarianId?: string | null,
  ) {}
}
