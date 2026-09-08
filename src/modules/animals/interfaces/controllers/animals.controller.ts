import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AnimalsService } from '../../application/services/animals.service';
import { AnimalResponseDto } from '../dto/animal-response.dto';
import { ListAnimalsQueryDto } from '../dto/list-animals.query.dto';
import { PaginatedAnimalsResponseDto } from '../dto/paginated-animals-response.dto';

@ApiTags('animals')
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

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
}
