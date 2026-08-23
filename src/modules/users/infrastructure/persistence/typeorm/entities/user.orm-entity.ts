import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { UserRole } from '../../../../../../common/enums/user-role.enum';

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
    default: () => "ARRAY['shelter_manager']::user_role[]",
  })
  roles!: UserRole[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
