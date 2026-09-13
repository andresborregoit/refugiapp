import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
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
  @MinLength(3)
  @MaxLength(3)
  currency!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  description!: string;

  @ApiProperty()
  @IsDateString()
  incurredAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketMediaId?: string;
}
