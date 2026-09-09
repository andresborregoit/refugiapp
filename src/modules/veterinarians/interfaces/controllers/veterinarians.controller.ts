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
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
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
  @ApiOperation({ summary: 'Create a veterinarian professional profile' })
  @ApiCreatedResponse({ type: VeterinarianResponseDto, description: 'Veterinarian created successfully.' })
  @ApiConflictResponse({ description: 'License number or user already linked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  create(@Body() dto: CreateVeterinarianDto): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List veterinarian professional profiles' })
  @ApiOkResponse({ type: PaginatedVeterinariansResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  list(@Query() query: ListVeterinariansQueryDto): Promise<PaginatedVeterinariansResponseDto> {
    return this.veterinariansService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a veterinarian professional profile by id' })
  @ApiOkResponse({ type: VeterinarianResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<VeterinarianResponseDto> {
    return this.veterinariansService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a veterinarian professional profile' })
  @ApiOkResponse({ type: VeterinarianResponseDto, description: 'Veterinarian updated successfully.' })
  @ApiConflictResponse({ description: 'License number or user already linked.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
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
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.veterinariansService.deactivate(id);
  }
}
