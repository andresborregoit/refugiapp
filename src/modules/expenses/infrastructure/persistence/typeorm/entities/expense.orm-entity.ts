import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { ExpenseCategory } from '../../../../domain/enums/expense-category.enum';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';

@Entity({ name: 'expenses' })
@Index(['animalId'])
@Index(['incurredAt'])
export class ExpenseOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

  @ManyToOne(() => AnimalOrmEntity, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'animalId' })
  animal!: AnimalOrmEntity;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
    enumName: 'expense_category',
  })
  category!: ExpenseCategory;

  @Column({ type: 'integer' })
  amountCents!: number;

  @Column({ type: 'char', length: 3, default: 'ARS' })
  currency!: string;

  @Column({ type: 'varchar', length: 180 })
  description!: string;

  @Column({ type: 'uuid', nullable: true })
  ticketMediaId?: string | null;

  @ManyToOne(() => MediaAssetOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticketMediaId' })
  ticketMedia?: MediaAssetOrmEntity | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: UserOrmEntity | null;

  @Column({ type: 'timestamptz' })
  incurredAt!: Date;
}
