import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { DeviceSubscriptionsService } from '../../application/services/device-subscriptions.service';
import { RegisterDeviceDto } from '../dto/notification-request.dto';
import { DeviceSubscriptionResponseDto } from '../dto/notification-response.dto';

@ApiTags('notifications')
@Controller('notifications/devices')
export class DeviceSubscriptionsController {
  constructor(private readonly devicesService: DeviceSubscriptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or rotate the current device push token' })
  @ApiCreatedResponse({ type: DeviceSubscriptionResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async register(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeviceSubscriptionResponseDto> {
    const device = await this.devicesService.register(user.id, dto);

    return DeviceSubscriptionResponseDto.fromDomain(device);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my active push devices' })
  @ApiOkResponse({ type: [DeviceSubscriptionResponseDto] })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async listMine(@CurrentUser() user: AuthenticatedUser): Promise<DeviceSubscriptionResponseDto[]> {
    const devices = await this.devicesService.listMine(user.id);

    return devices.map(DeviceSubscriptionResponseDto.fromDomain);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove one of my push devices (use on logout)' })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.devicesService.remove(user.id, id);
  }
}
