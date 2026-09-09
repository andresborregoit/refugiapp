import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { AnimalHistoryEventsService } from '../../application/services/animal-history-events.service';
import { AnimalHistoryEventResponseDto } from '../dto/animal-history-event-response.dto';
import { CreateAnimalHistoryEventDto } from '../dto/create-animal-history-event.dto';
import { ListAnimalHistoryEventsQueryDto } from '../dto/list-animal-history-events.query.dto';
import { PaginatedAnimalHistoryEventsResponseDto } from '../dto/paginated-animal-history-events-response.dto';

@ApiTags('animals')
@Controller('animals/:animalId/events')
export class AnimalHistoryEventsController {
  constructor(private readonly eventsService: AnimalHistoryEventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a history event for an animal' })
  @ApiCreatedResponse({
    type: AnimalHistoryEventResponseDto,
    description: 'Event created successfully.',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  create(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: CreateAnimalHistoryEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AnimalHistoryEventResponseDto> {
    return this.eventsService.create(
      animalId,
      dto.eventType,
      dto.description,
      user.id,
      dto.occurredAt,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List history events for an animal' })
  @ApiOkResponse({ type: PaginatedAnimalHistoryEventsResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  list(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() query: ListAnimalHistoryEventsQueryDto,
  ): Promise<PaginatedAnimalHistoryEventsResponseDto> {
    return this.eventsService.list({
      animalId,
      page: query.page,
      limit: query.limit,
      eventType: query.eventType,
    });
  }
}
