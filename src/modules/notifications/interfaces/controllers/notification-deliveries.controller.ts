import { Controller, Get, HttpStatus, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from '../../domain/repositories/notification-delivery.repository';
import { ListDeliveriesQueryDto } from '../dto/list-deliveries.query.dto';
import { NotificationDeliveryResponseDto } from '../dto/notification-response.dto';

@ApiTags('notifications')
@Controller('notifications/deliveries')
export class NotificationDeliveriesController {
  constructor(
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepository,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List push delivery outbox (diagnostics, no tokens)' })
  @ApiOkResponse({ type: [NotificationDeliveryResponseDto] })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async list(@Query() query: ListDeliveriesQueryDto): Promise<{
    items: NotificationDeliveryResponseDto[];
    page: number;
    limit: number;
    total: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const result = await this.deliveries.findMany({
      page,
      limit,
      careTaskId: query.careTaskId,
      status: query.status,
    });

    return {
      items: result.items.map(NotificationDeliveryResponseDto.fromDomain),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
  }
}
