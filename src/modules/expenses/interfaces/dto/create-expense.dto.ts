import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ExpenseCategory } from '../../domain/enums/expense-category.enum';

export class CreateExpenseDto {
  @ApiProperty()
  @IsUUID()
  animalId!: string;

  @ApiProperty({ enum: ExpenseCategory })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  amountCents!: number;

  @ApiProperty({ example: 'ARS' })
  @IsString()
  currency!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsDateString()
  incurredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketMediaId?: string;
}
