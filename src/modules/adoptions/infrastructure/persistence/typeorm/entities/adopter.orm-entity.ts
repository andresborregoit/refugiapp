import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';

@Entity({ name: 'adopters' })
@Index('IDX_adopters_email', ['email'], { unique: true })
export class AdopterOrmEntity extends BaseOrmEntity {
  @Column({ type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 32 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;
}
