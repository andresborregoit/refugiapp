import { MedicalRecordType } from '../enums/medical-record-type.enum';

export class UpdateMedicalRecord {
  constructor(
    public readonly changedByUserId: string,
    public readonly recordType?: MedicalRecordType,
    public readonly title?: string,
    public readonly occurredAt?: Date,
    public readonly veterinarianId?: string | null,
    public readonly diagnosis?: string | null,
    public readonly treatment?: string | null,
    public readonly notes?: string | null,
  ) {}
}
