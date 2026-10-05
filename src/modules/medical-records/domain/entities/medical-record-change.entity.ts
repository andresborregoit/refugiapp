import { MedicalRecordChangeType } from '../enums/medical-record-change-type.enum';
import { ChangeActor } from './change-actor.entity';

export class MedicalRecordChange {
  public readonly changedFields: string[];

  constructor(
    public readonly id: string,
    public readonly medicalRecordId: string,
    public readonly changedByUserId: string | null,
    public readonly changeType: MedicalRecordChangeType,
    public readonly previousValues: Record<string, unknown>,
    public readonly changedAt: Date,
    public readonly changedBy: ChangeActor | null = null,
  ) {
    this.changedFields = Object.keys(this.previousValues).sort();
  }
}
