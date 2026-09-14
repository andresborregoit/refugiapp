import { ApiProperty } from '@nestjs/swagger';
import { AuditLogResponseDto } from './audit-log-response.dto';

export class PaginatedAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items!: AuditLogResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}