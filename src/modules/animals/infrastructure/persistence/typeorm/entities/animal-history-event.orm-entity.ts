import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';

@Entity({ name: 'animal_history_events' })
@Index(['animalId'])
@Index(['occurredAt'])
export class AnimalHistoryEventOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

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

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
