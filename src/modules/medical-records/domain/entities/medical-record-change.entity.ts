import { MedicalRecordChangeType } from '../enums/medical-record-change-type.enum';

export class MedicalRecordChange {
  constructor(
    public readonly id: string,
    public readonly medicalRecordId: string,
    public readonly changedByUserId: string | null,
    public readonly changeType: MedicalRecordChangeType,
    public readonly previousValues: Record<string, unknown>,
    public readonly changedAt: Date,
  ) {}
}
