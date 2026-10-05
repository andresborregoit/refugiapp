import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationDeliveryStatus } from '../../domain/enums/notification-delivery-status.enum';

export class ListDeliveriesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  careTaskId?: string;

  @ApiPropertyOptional({ enum: NotificationDeliveryStatus })
  @IsOptional()
  @IsEnum(NotificationDeliveryStatus)
  status?: NotificationDeliveryStatus;
}
