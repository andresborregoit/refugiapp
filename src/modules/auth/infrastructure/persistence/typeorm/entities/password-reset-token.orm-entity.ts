import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';

@Entity({ name: 'password_reset_tokens' })
@Index('IDX_password_reset_tokens_tokenHash', ['tokenHash'], { unique: true })
@Index('IDX_password_reset_tokens_userId', ['userId'])
@Index('IDX_password_reset_tokens_expiresAt', ['expiresAt'])
export class PasswordResetTokenOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt!: Date | null;
}
