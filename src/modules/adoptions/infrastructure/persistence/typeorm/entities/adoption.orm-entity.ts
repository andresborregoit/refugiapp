import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { AdopterOrmEntity } from './adopter.orm-entity';
import { AdoptionApplicationOrmEntity } from './adoption-application.orm-entity';

@Entity({ name: 'adoptions' })
@Index('IDX_adoptions_animalId', ['animalId'], { unique: true })
@Index('IDX_adoptions_applicationId', ['applicationId'], { unique: true })
@Index('IDX_adoptions_adoptedAt', ['adoptedAt'])
export class AdoptionOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @OneToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({ type: 'uuid' })
  adopterId!: string;

  @ManyToOne(() => AdopterOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'adopterId' })
  adopter!: AdopterOrmEntity;

  @Column({ type: 'uuid' })
  applicationId!: string;

  @OneToOne(() => AdoptionApplicationOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'applicationId' })
  application!: AdoptionApplicationOrmEntity;

  @Column({ type: 'timestamptz' })
  adoptedAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  responsibleUserId!: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsibleUserId' })
  responsibleUser?: UserOrmEntity | null;
}
