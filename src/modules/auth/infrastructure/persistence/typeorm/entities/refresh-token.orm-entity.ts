import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';

@Entity({ name: 'refresh_tokens' })
@Index(['tokenHash'], { unique: true })
@Index(['familyId'])
@Index(['userId'])
@Index(['expiresAt'])
export class RefreshTokenOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: UserOrmEntity;

  @Column({ type: 'uuid' })
  familyId!: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  replacedById?: string | null;
}