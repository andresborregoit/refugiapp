import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import {
  RATE_LIMIT_PROFILES,
  UseRateLimitProfile,
} from '../../../../common/decorators/rate-limit-profile.decorator';
import { AuthService } from '../../application/services/auth.service';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

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
}