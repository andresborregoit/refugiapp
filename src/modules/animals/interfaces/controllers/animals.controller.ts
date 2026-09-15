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
import { AnimalsService } from '../../application/services/animals.service';
import { AnimalResponseDto } from '../dto/animal-response.dto';
import { ChangeAnimalStatusDto } from '../dto/change-animal-status.dto';
import { CreateAnimalDto } from '../dto/create-animal.dto';
import { ListAnimalsQueryDto } from '../dto/list-animals.query.dto';
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
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
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
}
