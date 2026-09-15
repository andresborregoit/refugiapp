import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { MedicalRecordChangeType } from '../../../../domain/enums/medical-record-change-type.enum';
import { MedicalRecordOrmEntity } from './medical-record.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';

@Entity({ name: 'medical_record_changes' })
@Index(['medicalRecordId'])
@Index(['changedAt'])
export class MedicalRecordChangeOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  medicalRecordId!: string;

  @ManyToOne(() => MedicalRecordOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicalRecordId' })
  medicalRecord!: MedicalRecordOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changedByUserId' })
  changedByUser?: UserOrmEntity | null;

  @Column({
    type: 'enum',
    enum: MedicalRecordChangeType,
    enumName: 'medical_record_change_type',
  })
  changeType!: MedicalRecordChangeType;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  previousValues!: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  changedAt!: Date;
}
