import { ApiProperty } from '@nestjs/swagger';
import { MedicalRecordChangeResponseDto } from './medical-record-change-response.dto';

export class PaginatedMedicalRecordChangesResponseDto {
  @ApiProperty({ type: MedicalRecordChangeResponseDto, isArray: true })
  items!: MedicalRecordChangeResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}