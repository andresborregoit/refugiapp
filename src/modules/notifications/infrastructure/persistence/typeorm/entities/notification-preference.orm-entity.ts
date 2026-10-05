import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';

@Entity({ name: 'notification_preferences' })
export class NotificationPreferenceOrmEntity {
  @Column({ type: 'uuid', primary: true })
  userId!: string;

  @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserOrmEntity;

  @Column({ type: 'boolean', default: true })
  overdueEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  upcomingEnabled!: boolean;

  @Column({ type: 'integer', default: 60 })
  upcomingWindowMinutes!: number;

  @Column({ type: 'time', nullable: true })
  quietStart?: string | null;

  @Column({ type: 'time', nullable: true })
  quietEnd?: string | null;

  @Column({ type: 'varchar', length: 64, default: 'America/Argentina/Buenos_Aires' })
  timezone!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
