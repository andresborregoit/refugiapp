import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { BreedOrmEntity } from './breed.orm-entity';

@Entity({ name: 'species' })
@Index(['slug'], { unique: true })
@Index(['sortOrder'])
export class SpeciesOrmEntity extends BaseOrmEntity {
  @Column({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  labelEs!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;

  @OneToMany(() => BreedOrmEntity, (breed) => breed.species)
  breeds?: BreedOrmEntity[];
}