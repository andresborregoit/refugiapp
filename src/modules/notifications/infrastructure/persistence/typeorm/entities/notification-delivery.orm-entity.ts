import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { CareTaskOrmEntity } from '../../../../../care-tasks/infrastructure/persistence/typeorm/entities/care-task.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { NotificationDeliveryStatus } from '../../../../domain/enums/notification-delivery-status.enum';
import { NotificationKind } from '../../../../domain/enums/notification-kind.enum';

@Entity({ name: 'notification_deliveries' })
@Index(['careTaskId', 'kind'])
@Index(['status', 'createdAt'])
export class NotificationDeliveryOrmEntity extends BaseOrmEntity {
  @Column({ type: 'varchar', length: 180, unique: true })
  dedupKey!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserOrmEntity;

  @Column({ type: 'uuid' })
  careTaskId!: string;

  @ManyToOne(() => CareTaskOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'careTaskId' })
  careTask?: CareTaskOrmEntity;

  @Column({ type: 'enum', enum: NotificationKind, enumName: 'notification_kind' })
  kind!: NotificationKind;

  @Column({ type: 'timestamptz', nullable: true })
  dueAtSnapshot?: Date | null;

  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    enumName: 'notification_delivery_status',
    default: NotificationDeliveryStatus.QUEUED,
  })
  status!: NotificationDeliveryStatus;

  @Column({ type: 'varchar', length: 160, nullable: true })
  providerReceiptId?: string | null;

  @Column({ type: 'integer', default: 0 })
  attemptCount!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastErrorCode?: string | null;
}
