import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { SpeciesOrmEntity } from './species.orm-entity';

@Entity({ name: 'breeds' })
@Index(['speciesId', 'slug'], { unique: true })
@Index(['speciesId', 'labelEs'])
export class BreedOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  speciesId!: string;

  @ManyToOne(() => SpeciesOrmEntity, (species) => species.breeds, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'speciesId' })
  species?: SpeciesOrmEntity;

  @Column({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  labelEs!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;
}