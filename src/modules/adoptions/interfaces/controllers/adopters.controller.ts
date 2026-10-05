import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AdoptionsService } from '../../application/services/adoptions.service';
import { AdopterResponseDto } from '../dto/adopter-response.dto';
import { CreateAdopterDto } from '../dto/create-adopter.dto';

@ApiTags('adoptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('adopters')
export class AdoptersController {
  constructor(private readonly adoptionsService: AdoptionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiOperation({ summary: 'Create an adopter contact profile' })
  @ApiCreatedResponse({ type: AdopterResponseDto })
  @ApiConflictResponse({ description: 'An adopter with the same email already exists.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  create(
    @Body() dto: CreateAdopterDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdopterResponseDto> {
    return this.adoptionsService.createAdopter(dto, user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiOperation({ summary: 'Get an adopter contact profile' })
  @ApiOkResponse({ type: AdopterResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  get(@Param('id', ParseUUIDPipe) id: string): Promise<AdopterResponseDto> {
    return this.adoptionsService.getAdopter(id);
  }
}
