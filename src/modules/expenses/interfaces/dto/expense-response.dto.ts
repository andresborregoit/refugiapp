import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '../../domain/enums/expense-category.enum';

export class ExpenseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiProperty({ enum: ExpenseCategory })
  category!: ExpenseCategory;

  @ApiProperty({ example: 1250 })
  amountCents!: number;

  @ApiProperty({ example: 'ARS' })
  currency!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  ticketMediaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  createdByUserId?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  incurredAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}