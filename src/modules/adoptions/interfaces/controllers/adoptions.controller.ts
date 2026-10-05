import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { AdoptionsService } from '../../application/services/adoptions.service';
import { AdoptionApplicationResponseDto } from '../dto/adoption-application-response.dto';
import { AdoptionResponseDto } from '../dto/adoption-response.dto';
import { ApproveAdoptionDto } from '../dto/approve-adoption.dto';
import { CreateAdoptionApplicationDto } from '../dto/create-adoption-application.dto';
import { ListAdoptionsQueryDto } from '../dto/list-adoptions.query.dto';
import { PaginatedAdoptionApplicationsResponseDto } from '../dto/paginated-adoption-applications-response.dto';
import { PaginatedAdoptionsResponseDto } from '../dto/paginated-adoptions-response.dto';

@ApiTags('adoptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AdoptionsController {
  constructor(private readonly adoptionsService: AdoptionsService) {}

  @Post('animals/:animalId/adoption-applications')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiOperation({ summary: 'Register an adoption application for an animal' })
  @ApiCreatedResponse({ type: AdoptionApplicationResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  createApplication(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: CreateAdoptionApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdoptionApplicationResponseDto> {
    return this.adoptionsService.createApplication(animalId, dto, user.id);
  }

  @Get('animals/:animalId/adoption-applications')
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiOperation({ summary: 'List adoption applications for an animal' })
  @ApiOkResponse({ type: PaginatedAdoptionApplicationsResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  listApplications(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() query: ListAdoptionsQueryDto,
  ): Promise<PaginatedAdoptionApplicationsResponseDto> {
    return this.adoptionsService.listApplications(animalId, query);
  }

  @Post('adoption-applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiOperation({ summary: 'Approve an application and complete the adoption atomically' })
  @ApiOkResponse({ type: AdoptionResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAdoptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AdoptionResponseDto> {
    return this.adoptionsService.approve(id, dto, user.id);
  }

  @Get('animals/:animalId/adoptions')
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiOperation({ summary: 'List the adoption history for an animal' })
  @ApiOkResponse({ type: PaginatedAdoptionsResponseDto })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  listAdoptions(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() query: ListAdoptionsQueryDto,
  ): Promise<PaginatedAdoptionsResponseDto> {
    return this.adoptionsService.listAdoptions(animalId, query);
  }
}
