import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { AdoptionApplicationStatus } from '../../../../domain/enums/adoption-application-status.enum';
import { AdopterOrmEntity } from './adopter.orm-entity';

@Entity({ name: 'adoption_applications' })
@Index('IDX_adoption_applications_animalId', ['animalId'])
@Index('IDX_adoption_applications_adopterId', ['adopterId'])
@Index('IDX_adoption_applications_status', ['status'])
@Index('IDX_adoption_applications_pending', ['animalId', 'adopterId'], {
  unique: true,
  where: `"status" = 'pending' AND "deletedAt" IS NULL`,
})
export class AdoptionApplicationOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @ManyToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({ type: 'uuid' })
  adopterId!: string;

  @ManyToOne(() => AdopterOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'adopterId' })
  adopter!: AdopterOrmEntity;

  @Column({
    type: 'enum',
    enum: AdoptionApplicationStatus,
    enumName: 'adoption_application_status',
    default: AdoptionApplicationStatus.PENDING,
  })
  status!: AdoptionApplicationStatus;

  @Column({ type: 'timestamptz' })
  submittedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: UserOrmEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  decidedByUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decidedByUserId' })
  decidedByUser?: UserOrmEntity | null;
}
