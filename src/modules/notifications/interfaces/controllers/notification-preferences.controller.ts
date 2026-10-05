import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { NotificationPreferencesService } from '../../application/services/notification-preferences.service';
import { UpdatePreferencesDto } from '../dto/notification-request.dto';
import { NotificationPreferenceResponseDto } from '../dto/notification-response.dto';

@ApiTags('notifications')
@Controller('notifications/preferences')
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my push notification preferences' })
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async getMine(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.preferencesService.getMine(user.id);

    return NotificationPreferenceResponseDto.fromDomain(preference);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my push notification preferences' })
  @ApiOkResponse({ type: NotificationPreferenceResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async updateMine(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationPreferenceResponseDto> {
    const preference = await this.preferencesService.updateMine(user.id, dto);

    return NotificationPreferenceResponseDto.fromDomain(preference);
  }
}
