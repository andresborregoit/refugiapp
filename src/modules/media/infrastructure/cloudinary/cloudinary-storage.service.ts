import { Inject, Injectable, Logger } from '@nestjs/common';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import { CLOUDINARY_CLIENT, CloudinaryClient } from './cloudinary.provider';

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  resourceType: MediaResourceType;
}

export interface UploadFileOptions {
  folder: string;
  resourceType: MediaResourceType;
  allowedFormats?: string[];
  maxFileSize?: number;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(
    @Inject(CLOUDINARY_CLIENT)
    private readonly client: CloudinaryClient,
  ) {}

  getClient(): CloudinaryClient {
    return this.client;
  }

  buildUploadFolder(ownerType: MediaOwnerType, ownerId: string): string {
    return `refugiapp/${ownerType}/${ownerId}`;
  }

  async upload(
    fileBuffer: Buffer,
    options: UploadFileOptions,
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.client.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: this.mapResourceType(options.resourceType),
          allowed_formats: options.allowedFormats,
          format: options.resourceType === MediaResourceType.RAW ? undefined : undefined,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(error);
            return;
          }

          if (!result) {
            reject(new Error('Cloudinary upload returned no result'));
            return;
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            resourceType: this.mapResourceTypeFromCloudinary(result.resource_type),
          });
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    try {
      await this.client.uploader.destroy(publicId);
      this.logger.log(`Cloudinary asset deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete Cloudinary asset ${publicId}: ${error}`);
      throw error;
    }
  }

  private mapResourceType(type: MediaResourceType): 'image' | 'video' | 'raw' {
    switch (type) {
      case MediaResourceType.IMAGE:
        return 'image';
      case MediaResourceType.VIDEO:
        return 'video';
      case MediaResourceType.RAW:
        return 'raw';
      default:
        return 'image';
    }
  }

  private mapResourceTypeFromCloudinary(type: string): MediaResourceType {
    switch (type) {
      case 'image':
        return MediaResourceType.IMAGE;
      case 'video':
        return MediaResourceType.VIDEO;
      case 'raw':
        return MediaResourceType.RAW;
      default:
        return MediaResourceType.IMAGE;
    }
  }
}
