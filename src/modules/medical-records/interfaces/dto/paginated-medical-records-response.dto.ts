import { ApiProperty } from '@nestjs/swagger';
import { MedicalRecordResponseDto } from './medical-record-response.dto';

export class PaginatedMedicalRecordsResponseDto {
  @ApiProperty({ type: MedicalRecordResponseDto, isArray: true })
  items!: MedicalRecordResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 5 })
  total!: number;
}
