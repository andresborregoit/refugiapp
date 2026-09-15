import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AuditLogsService } from '../../application/services/audit-logs.service';
import { AuditLogResponseDto } from '../dto/audit-log-response.dto';
import { ListAuditLogsQueryDto } from '../dto/list-audit-logs.query.dto';
import { PaginatedAuditLogsResponseDto } from '../dto/paginated-audit-logs-response.dto';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List audit log entries with pagination and filters (admin only)' })
  @ApiOkResponse({ type: PaginatedAuditLogsResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  list(@Query() query: ListAuditLogsQueryDto): Promise<PaginatedAuditLogsResponseDto> {
    return this.auditLogsService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an audit log entry by id (admin only)' })
  @ApiOkResponse({ type: AuditLogResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLogResponseDto> {
    const entry = await this.auditLogsService.findById(id);

    if (!entry) {
      throw new ResourceNotFoundException('AuditLog', id);
    }

    return entry;
  }
}