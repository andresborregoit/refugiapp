import { MediaOwnerType } from '../enums/media-owner-type.enum';
import { MediaResourceType } from '../enums/media-resource-type.enum';

export class MediaAsset {
  constructor(
    public readonly id: string,
    public readonly ownerType: MediaOwnerType,
    public readonly ownerId: string,
    public readonly resourceType: MediaResourceType,
    public readonly publicId: string,
    public readonly secureUrl: string,
  ) {}
}
