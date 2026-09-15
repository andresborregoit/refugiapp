import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { MedicalRecordsService } from '../../application/services/medical-records.service';
import { ListMedicalRecordsQueryDto } from '../dto/list-medical-records.query.dto';
import { PaginatedMedicalRecordsResponseDto } from '../dto/paginated-medical-records-response.dto';

@ApiTags('medical-records')
@Controller('animals/:animalId/medical-records')
export class AnimalMedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List medical records for an animal' })
  @ApiOkResponse({ type: PaginatedMedicalRecordsResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  listByAnimal(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Query() query: ListMedicalRecordsQueryDto,
  ): Promise<PaginatedMedicalRecordsResponseDto> {
    return this.medicalRecordsService.listByAnimal(animalId, query);
  }
}
