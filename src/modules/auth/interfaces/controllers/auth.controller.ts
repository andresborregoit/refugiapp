import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import {
  RATE_LIMIT_PROFILES,
  UseRateLimitProfile,
} from '../../../../common/decorators/rate-limit-profile.decorator';
import { AuthService } from '../../application/services/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ConfirmPasswordResetDto } from '../dto/confirm-password-reset.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { PasswordResetRequestedDto } from '../dto/password-reset-requested.dto';
import { JwtAuthGuard } from '../../infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseRateLimitProfile(RATE_LIMIT_PROFILES.LOGIN)
  @ApiOperation({ summary: 'Authenticate a user with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrorResponses()
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseRateLimitProfile(RATE_LIMIT_PROFILES.LOGIN)
  @ApiOperation({ summary: 'Rotate an opaque refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the authenticated user password' })
  @ApiNoContentResponse({ description: 'Password changed and active refresh sessions revoked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.authService.changePassword(user.id, dto);
  }

  @Post('password-recovery/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseRateLimitProfile(RATE_LIMIT_PROFILES.LOGIN)
  @ApiOperation({ summary: 'Request password recovery instructions' })
  @ApiAcceptedResponse({ type: PasswordResetRequestedDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.TOO_MANY_REQUESTS)
  requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<PasswordResetRequestedDto> {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-recovery/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseRateLimitProfile(RATE_LIMIT_PROFILES.LOGIN)
  @ApiOperation({ summary: 'Set a new password with a single-use recovery token' })
  @ApiNoContentResponse({ description: 'Password changed and active refresh sessions revoked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS)
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<void> {
    return this.authService.confirmPasswordReset(dto);
  }
}
