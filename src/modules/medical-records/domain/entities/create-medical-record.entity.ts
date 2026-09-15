import { MedicalRecordType } from '../enums/medical-record-type.enum';

export class CreateMedicalRecord {
  constructor(
    public readonly animalId: string,
    public readonly recordType: MedicalRecordType,
    public readonly title: string,
    public readonly occurredAt: Date,
    public readonly veterinarianId: string | null,
    public readonly diagnosis: string | null,
    public readonly treatment: string | null,
    public readonly notes: string | null,
    public readonly attachmentMediaIds: string[] = [],
  ) {}
}
