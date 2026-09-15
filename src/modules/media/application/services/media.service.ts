import { Inject, Injectable } from '@nestjs/common';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import {
  MEDIA_ASSET_REPOSITORY,
  MediaAssetRepository,
} from '../../domain/repositories/media-asset.repository';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/cloudinary-storage.service';

@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  findById(id: string) {
    return this.mediaAssetRepository.findById(id);
  }

  buildUploadFolder(ownerType: MediaOwnerType, ownerId: string): string {
    return this.cloudinaryStorageService.buildUploadFolder(ownerType, ownerId);
  }
}
