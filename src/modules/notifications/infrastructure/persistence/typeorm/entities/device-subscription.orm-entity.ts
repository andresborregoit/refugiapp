import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { DevicePlatform } from '../../../../domain/enums/device-platform.enum';

@Entity({ name: 'device_subscriptions' })
@Index(['userId'])
@Index(['tokenHash'], { unique: true })
export class DeviceSubscriptionOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserOrmEntity;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 255 })
  expoPushToken!: string;

  @Column({ type: 'varchar', length: 12 })
  tokenSuffix!: string;

  @Column({ type: 'enum', enum: DevicePlatform, enumName: 'device_platform' })
  platform!: DevicePlatform;

  @Column({ type: 'varchar', length: 64, default: 'America/Argentina/Buenos_Aires' })
  timezone!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  appVersion?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  lastSeenAt!: Date;
}
