import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../../../common/interfaces/error-response.dto';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { VeterinariansService } from '../../application/services/veterinarians.service';
import { CreateVeterinarianDto } from '../dto/create-veterinarian.dto';
import { ListVeterinariansQueryDto } from '../dto/list-veterinarians.query.dto';
import { PaginatedVeterinariansResponseDto } from '../dto/paginated-veterinarians-response.dto';
import { UpdateVeterinarianDto } from '../dto/update-veterinarian.dto';
import { VeterinarianResponseDto } from '../dto/veterinarian-response.dto';

@ApiTags('veterinarians')
@Controller('veterinarians')
export class VeterinariansController {
  constructor(private readonly veterinariansService: VeterinariansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a veterinarian professional profile',
    description:
      'Optionally creates and links a user with the veterinarian role in the same transaction (createUser). ' +
      'If the createUser email already belongs to an unlinked user, that user is reused and the veterinarian role is granted. ' +
      'userId and createUser are mutually exclusive.',
  })
  @ApiCreatedResponse({ type: VeterinarianResponseDto, description: 'Veterinarian created successfully.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'License number, email or user already linked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  create(
    @Body() dto: CreateVeterinarianDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.create(dto, actor.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List veterinarian professional profiles' })
  @ApiOkResponse({ type: PaginatedVeterinariansResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.TOO_MANY_REQUESTS)
  list(@Query() query: ListVeterinariansQueryDto): Promise<PaginatedVeterinariansResponseDto> {
    return this.veterinariansService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a veterinarian professional profile by id' })
  @ApiOkResponse({ type: VeterinarianResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a veterinarian professional profile' })
  @ApiOkResponse({ type: VeterinarianResponseDto, description: 'Veterinarian updated successfully.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'License number or user already linked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVeterinarianDto,
  ): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.update(id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a veterinarian without deleting clinical history' })
  @ApiNoContentResponse({ description: 'Veterinarian deactivated successfully.' })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.veterinariansService.deactivate(id);
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate a deactivated veterinarian preserving clinical history' })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Veterinarian id (UUID).',
  })
  @ApiOkResponse({ type: VeterinarianResponseDto, description: 'Veterinarian reactivated successfully.' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Veterinarian is already active.' })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.TOO_MANY_REQUESTS)
  reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.reactivate(id, actor.id);
  }
}
