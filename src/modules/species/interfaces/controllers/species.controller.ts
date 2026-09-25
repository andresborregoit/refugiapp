import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { SpeciesService } from '../../application/services/species.service';
import { Breed } from '../../domain/entities/breed.entity';
import { Species } from '../../domain/entities/species.entity';
import { BreedListResponseDto } from '../dto/breed-list-response.dto';
import { BreedResponseDto } from '../dto/breed-response.dto';
import { SpeciesListResponseDto } from '../dto/species-list-response.dto';
import { SpeciesResponseDto } from '../dto/species-response.dto';

@ApiTags('species')
@Controller('species')
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the animal species catalog' })
  @ApiOkResponse({ type: SpeciesListResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async listSpecies(): Promise<SpeciesListResponseDto> {
    const species = await this.speciesService.listSpecies();

    return { items: species.map((item) => this.toSpeciesResponse(item)) };
  }

  @Get(':id/breeds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the breeds for a species' })
  @ApiOkResponse({ type: BreedListResponseDto })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'Species id (UUID).',
  })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async listBreeds(@Param('id', ParseUUIDPipe) id: string): Promise<BreedListResponseDto> {
    const breeds = await this.speciesService.listBreedsBySpeciesId(id);

    return { items: breeds.map((item) => this.toBreedResponse(item)) };
  }

  private toSpeciesResponse(species: Species): SpeciesResponseDto {
    return {
      id: species.id,
      slug: species.slug,
      labelEs: species.labelEs,
    };
  }

  private toBreedResponse(breed: Breed): BreedResponseDto {
    return {
      id: breed.id,
      speciesId: breed.speciesId,
      slug: breed.slug,
      labelEs: breed.labelEs,
    };
  }
}