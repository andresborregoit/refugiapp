import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { UserRole } from '../../../../../../common/enums/user-role.enum';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class UserOrmEntity extends BaseOrmEntity {
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    array: true,
    default: [UserRole.SHELTER_MANAGER],
  })
  roles!: UserRole[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  profilePhotoMediaId?: string | null;

  @ManyToOne(() => MediaAssetOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profilePhotoMediaId' })
  profilePhotoMedia?: MediaAssetOrmEntity | null;
}
