import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { ExpenseCategory } from '../../../../domain/enums/expense-category.enum';

@Entity({ name: 'expenses' })
@Index(['animalId'])
@Index(['incurredAt'])
export class ExpenseOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid' })
  animalId!: string;

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

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @Column({ type: 'timestamptz' })
  incurredAt!: Date;
}
