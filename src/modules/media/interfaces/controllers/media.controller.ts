import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { MediaService } from '../../application/services/media.service';
import { UploadMediaAssetBodyDto } from '../dto/upload-media-asset-body.dto';
import { MediaAssetResponseDto } from '../dto/media-asset-response.dto';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Cloudinary and persist metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: MediaAssetResponseDto, description: 'File uploaded successfully.' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaAssetBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    const asset = await this.mediaService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      dto.ownerType,
      dto.ownerId,
      user.id,
    );

    return this.toResponseDto(asset);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get media asset metadata by id' })
  @ApiOkResponse({ type: MediaAssetResponseDto })
  @ApiErrorResponses(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<MediaAssetResponseDto> {
    const asset = await this.mediaService.findById(id);

    if (!asset) {
      throw new Error(`MediaAsset with id ${id} not found.`);
    }

    return this.toResponseDto(asset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a media asset from Cloudinary and database' })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.mediaService.delete(id);
  }

  private toResponseDto(asset: any): MediaAssetResponseDto {
    return {
      id: asset.id,
      ownerType: asset.ownerType,
      ownerId: asset.ownerId,
      resourceType: asset.resourceType,
      publicId: asset.publicId,
      secureUrl: asset.secureUrl,
      bytes: asset.bytes,
      format: asset.format,
      uploadedByUserId: asset.uploadedByUserId,
      metadata: asset.metadata,
    };
  }
}
