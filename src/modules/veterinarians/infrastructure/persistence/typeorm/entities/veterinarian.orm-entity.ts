import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';

@Entity({ name: 'veterinarians' })
@Index(['licenseNumber'], { unique: true })
export class VeterinarianOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 80 })
  licenseNumber!: string;

  @Column({ type: 'varchar', length: 320, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  phone?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}
