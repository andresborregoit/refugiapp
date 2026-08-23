import { Inject, Injectable } from '@nestjs/common';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { CLOUDINARY_CLIENT, CloudinaryClient } from './cloudinary.provider';

@Injectable()
export class CloudinaryStorageService {
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
}
