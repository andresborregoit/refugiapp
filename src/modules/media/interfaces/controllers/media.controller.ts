import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../../common/decorators/api-error-responses.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { MediaService } from '../../application/services/media.service';
import { UploadMediaAssetBodyDto } from '../dto/upload-media-asset-body.dto';
import { MediaAssetResponseDto } from '../dto/media-asset-response.dto';
import { ListMediaQueryDto } from '../dto/list-media.query.dto';
import { PaginatedMediaAssetsResponseDto } from '../dto/paginated-media-assets-response.dto';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a file to Cloudinary and persist metadata',
    description:
      'Uploads a file and persists its metadata. Omitting ownerType and ownerId creates an ' +
      'orphan asset that can be linked later to an animal, expense or medical record. Orphan ' +
      'assets are removed by the cleanup job after MEDIA_ORPHAN_RETENTION_HOURS (default 48h) ' +
      'unless they are linked; the uploader can delete their own orphan asset with ' +
      'DELETE /media/:id before it is linked.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: MediaAssetResponseDto, description: 'File uploaded successfully.' })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadMediaAssetBodyDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MediaAssetResponseDto> {
    if (!file) {
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'A file is required.',
      });
    }

    const asset = await this.mediaService.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      dto.ownerType ?? null,
      dto.ownerId ?? null,
      user,
    );

    return this.toResponseDto(asset);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List media assets by owner' })
  @ApiOkResponse({ type: PaginatedMediaAssetsResponseDto })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async listByOwner(
    @Query() query: ListMediaQueryDto,
  ): Promise<PaginatedMediaAssetsResponseDto> {
    const result = await this.mediaService.listByOwner(query);

    return {
      items: result.items.map((asset) => this.toResponseDto(asset)),
      page: result.page,
      limit: result.limit,
      total: result.total,
    };
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
      throw new ResourceNotFoundException('MediaAsset', id);
    }

    return this.toResponseDto(asset);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft-delete a media asset and remove its remote file',
    description:
      'Deletes a media asset (soft-delete on media_assets) and removes its Cloudinary file. ' +
      'admin and shelter_manager can delete any asset. veterinarian can delete clinical ' +
      'attachments (ownerType=medical_record) and orphan assets uploaded by the same user; ' +
      'deleting a foreign orphan or a linked asset owned by another entity returns 403.',
  })
  @ApiErrorResponses(
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.mediaService.delete(id, user);
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