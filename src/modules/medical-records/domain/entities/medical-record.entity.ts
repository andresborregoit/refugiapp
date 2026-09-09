import { MedicalRecordType } from '../enums/medical-record-type.enum';

export class MedicalRecord {
  constructor(
    public readonly id: string,
    public readonly animalId: string,
    public readonly recordType: MedicalRecordType,
    public readonly title: string,
    public readonly occurredAt: Date,
    public readonly veterinarianId: string | null,
    public readonly diagnosis: string | null,
    public readonly treatment: string | null,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly deletedAt: Date | null,
  ) {}
}
