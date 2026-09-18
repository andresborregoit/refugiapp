import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { CareTaskStatus } from '../../../../domain/enums/care-task-status.enum';

@Entity({ name: 'care_tasks' })
@Index(['animalId'])
@Index(['status'])
export class CareTaskOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @ManyToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: CareTaskStatus,
    enumName: 'care_task_status',
    default: CareTaskStatus.PENDING,
  })
  status!: CareTaskStatus;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: UserOrmEntity | null;
}