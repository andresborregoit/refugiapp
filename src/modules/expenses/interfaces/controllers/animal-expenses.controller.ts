import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { ExpensesService } from '../../application/services/expenses.service';
import { ListExpensesQueryDto } from '../dto/list-expenses.query.dto';
import { PaginatedExpensesResponseDto } from '../dto/paginated-expenses-response.dto';

@ApiTags('expenses')
@Controller('animals/:animalId/expenses')
export class AnimalExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List expenses for an animal' })
  @ApiOkResponse({ type: PaginatedExpensesResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  listByAnimal(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() query: ListExpensesQueryDto,
  ): Promise<PaginatedExpensesResponseDto> {
    return this.expensesService.listByAnimal(animalId, query);
  }
}