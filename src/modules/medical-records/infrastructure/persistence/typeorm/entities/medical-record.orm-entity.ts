import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { MedicalRecordType } from '../../../../domain/enums/medical-record-type.enum';

@Entity({ name: 'medical_records' })
@Index(['animalId'])
@Index(['occurredAt'])
export class MedicalRecordOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @Column({ type: 'uuid', nullable: true })
  veterinarianId?: string | null;

  @Column({
    type: 'enum',
    enum: MedicalRecordType,
    enumName: 'medical_record_type',
  })
  recordType!: MedicalRecordType;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  diagnosis?: string | null;

  @Column({ type: 'text', nullable: true })
  treatment?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;
}
