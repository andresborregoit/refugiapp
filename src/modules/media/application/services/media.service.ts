import { Inject, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import { MEDIA_ASSET_REPOSITORY, MediaAssetRepository } from '../../domain/repositories/media-asset.repository';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/cloudinary-storage.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
] as const;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  async findById(id: string): Promise<MediaAsset | null> {
    return this.mediaAssetRepository.findById(id);
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
    ownerType: MediaOwnerType,
    ownerId: string,
    uploadedByUserId: string,
  ): Promise<MediaAsset> {
    this.validateMimetype(mimetype);
    this.validateFileSize(fileBuffer.length);

    const folder = this.cloudinaryStorageService.buildUploadFolder(ownerType, ownerId);
    const resourceType = this.mapMimetypeToResourceType(mimetype);

    let cloudinaryResult;
    try {
      cloudinaryResult = await this.cloudinaryStorageService.upload(fileBuffer, {
        folder,
        resourceType,
        allowedFormats: this.getAllowedFormats(mimetype),
        maxFileSize: MAX_FILE_SIZE_BYTES,
      });
    } catch (error) {
      this.logger.error(`Cloudinary upload failed for ${ownerType}/${ownerId}: ${error}`);
      throw error;
    }

    const asset = new MediaAsset(
      randomUUID(),
      ownerType,
      ownerId,
      resourceType,
      cloudinaryResult.publicId,
      cloudinaryResult.secureUrl,
      cloudinaryResult.bytes,
      cloudinaryResult.format,
      uploadedByUserId,
      { originalFilename: filename, mimetype },
    );

    try {
      return await this.mediaAssetRepository.create(asset);
    } catch (error) {
      this.logger.error(`PostgreSQL persistence failed after Cloudinary upload. Compensating by deleting Cloudinary asset ${cloudinaryResult.publicId}.`);
      await this.cloudinaryStorageService.delete(cloudinaryResult.publicId);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const asset = await this.mediaAssetRepository.findById(id);

    if (!asset) {
      throw new BadRequestException(`MediaAsset with id ${id} does not exist.`);
    }

    await this.cloudinaryStorageService.delete(asset.publicId);
    await this.mediaAssetRepository.deleteByPublicId(asset.publicId);
  }

  buildUploadFolder(ownerType: MediaOwnerType, ownerId: string): string {
    return this.cloudinaryStorageService.buildUploadFolder(ownerType, ownerId);
  }

  private validateMimetype(mimetype: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      throw new BadRequestException(
        `Mimetype ${mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private validateFileSize(sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`,
      );
    }
  }

  private mapMimetypeToResourceType(mimetype: string): MediaResourceType {
    if (mimetype.startsWith('image/')) {
      return MediaResourceType.IMAGE;
    }
    if (mimetype.startsWith('video/')) {
      return MediaResourceType.VIDEO;
    }
    return MediaResourceType.RAW;
  }

  private getAllowedFormats(mimetype: string): string[] {
    switch (mimetype) {
      case 'image/jpeg':
        return ['jpg', 'jpeg'];
      case 'image/png':
        return ['png'];
      case 'image/webp':
        return ['webp'];
      case 'application/pdf':
        return ['pdf'];
      case 'video/mp4':
        return ['mp4'];
      default:
        return [];
    }
  }
}
