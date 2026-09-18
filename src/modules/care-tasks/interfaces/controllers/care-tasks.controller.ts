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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { CareTasksService } from '../../application/services/care-tasks.service';
import { CareTaskResponseDto } from '../dto/care-task-response.dto';
import { CreateCareTaskDto } from '../dto/create-care-task.dto';
import { ListCareTasksQueryDto } from '../dto/list-care-tasks.query.dto';
import { PaginatedCareTasksResponseDto } from '../dto/paginated-care-tasks-response.dto';
import { UpdateCareTaskDto } from '../dto/update-care-task.dto';

@ApiTags('care-tasks')
@Controller('care-tasks')
export class CareTasksController {
  constructor(private readonly careTasksService: CareTasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a care task for an animal' })
  @ApiCreatedResponse({ type: CareTaskResponseDto, description: 'Care task created successfully.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  create(
    @Body() dto: CreateCareTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CareTaskResponseDto> {
    return this.careTasksService.create(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List care tasks with pagination and filters' })
  @ApiOkResponse({ type: PaginatedCareTasksResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  list(@Query() query: ListCareTasksQueryDto): Promise<PaginatedCareTasksResponseDto> {
    return this.careTasksService.list(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a care task by id' })
  @ApiOkResponse({ type: CareTaskResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<CareTaskResponseDto> {
    return this.careTasksService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a care task partially' })
  @ApiOkResponse({ type: CareTaskResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCareTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CareTaskResponseDto> {
    return this.careTasksService.update(id, dto, user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a care task as completed' })
  @ApiOkResponse({ type: CareTaskResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CareTaskResponseDto> {
    return this.careTasksService.complete(id, user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a care task' })
  @ApiOkResponse({ type: CareTaskResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CareTaskResponseDto> {
    return this.careTasksService.cancel(id, user.id);
  }
}