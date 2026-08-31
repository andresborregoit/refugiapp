import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalSex } from '../../../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../../domain/enums/animal-status.enum';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';

@Entity({ name: 'animals' })
@Index(['status'])
export class AnimalOrmEntity extends BaseOrmEntity {
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 80 })
  species!: string;

  @Column({
    type: 'enum',
    enum: AnimalSex,
    enumName: 'animal_sex',
    default: AnimalSex.UNKNOWN,
  })
  sex!: AnimalSex;

  @Column({
    type: 'enum',
    enum: AnimalStatus,
    enumName: 'animal_status',
    default: AnimalStatus.ADMITTED,
  })
  status!: AnimalStatus;

  @Column({ type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ type: 'date' })
  intakeDate!: string;

  @Column({ type: 'uuid', nullable: true })
  profilePhotoMediaId?: string | null;

  @ManyToOne(() => MediaAssetOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'profilePhotoMediaId' })
  profilePhotoMedia?: MediaAssetOrmEntity | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;
}
