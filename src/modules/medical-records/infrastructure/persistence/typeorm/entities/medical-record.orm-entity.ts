import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { MedicalRecordType } from '../../../../domain/enums/medical-record-type.enum';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { VeterinarianOrmEntity } from '../../../../../veterinarians/infrastructure/persistence/typeorm/entities/veterinarian.orm-entity';

@Entity({ name: 'medical_records' })
@Index(['animalId'])
@Index(['occurredAt'])
export class MedicalRecordOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @ManyToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({ type: 'uuid', nullable: true })
  veterinarianId?: string | null;

  @ManyToOne(() => VeterinarianOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'veterinarianId' })
  veterinarian?: VeterinarianOrmEntity | null;

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
