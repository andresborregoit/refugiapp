import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { AnimalOrmEntity } from './animal.orm-entity';

@Entity({ name: 'animal_history_events' })
@Index(['animalId'])
@Index(['occurredAt'])
export class AnimalHistoryEventOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @ManyToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({
    type: 'enum',
    enum: AnimalHistoryEventType,
    enumName: 'animal_history_event_type',
  })
  eventType!: AnimalHistoryEventType;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: UserOrmEntity | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
