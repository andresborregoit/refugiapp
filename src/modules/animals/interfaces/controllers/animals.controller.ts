import {
  Body,
  Controller,
  Delete,
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
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { ErrorResponseDto } from '../../../../common/interfaces/error-response.dto';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AnimalsService } from '../../application/services/animals.service';
import { AnimalResponseDto } from '../dto/animal-response.dto';
import { ChangeAnimalStatusDto } from '../dto/change-animal-status.dto';
import { CreateAnimalDto } from '../dto/create-animal.dto';
import { ListAnimalsQueryDto } from '../dto/list-animals.query.dto';
import { UpdateAnimalDto } from '../dto/update-animal.dto';
import { PaginatedAnimalsResponseDto } from '../dto/paginated-animals-response.dto';

@ApiTags('animals')
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an animal' })
  @ApiCreatedResponse({ type: AnimalResponseDto, description: 'Animal created successfully.' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  create(
    @Body() dto: CreateAnimalDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnimalResponseDto> {
    return this.animalsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List animals with pagination and filters' })
  @ApiOkResponse({ type: PaginatedAnimalsResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  list(@Query() query: ListAnimalsQueryDto): Promise<PaginatedAnimalsResponseDto> {
    return this.animalsService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an animal by id' })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<AnimalResponseDto> {
    return this.animalsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an animal profile without changing its status' })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnimalDto,
  ): Promise<AnimalResponseDto> {
    return this.animalsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change animal status with transition validation' })
  @ApiOkResponse({ type: AnimalResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeAnimalStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnimalResponseDto> {
    return this.animalsService.changeStatus(id, dto.status, user.id, dto.occurredAt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete an animal with integrity rules (admin only)',
    description:
      'Applies a soft delete (`deletedAt`) and detaches the profile photo so the orphan purge policy can ' +
      'reclaim it. Requires the admin role; any other authenticated role receives 403. The animal is not ' +
      'deleted when it is under treatment (409 ANIMAL_UNDER_TREATMENT), has pending care tasks ' +
      '(409 ANIMAL_HAS_PENDING_TASKS) or has clinical, expense or adoption history (409 ANIMAL_HAS_HISTORY); ' +
      'in those cases nothing is removed. A missing or already deleted id responds 404.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Animal id (UUID).',
  })
  @ApiNoContentResponse({ description: 'Animal deleted successfully.' })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description:
      'The animal cannot be deleted: ANIMAL_UNDER_TREATMENT, ANIMAL_HAS_PENDING_TASKS or ANIMAL_HAS_HISTORY.',
  })
  @ApiErrorResponses(
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.TOO_MANY_REQUESTS,
  )
  deleteAnimal(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.animalsService.deleteAnimal(id, user.id);
  }
}
