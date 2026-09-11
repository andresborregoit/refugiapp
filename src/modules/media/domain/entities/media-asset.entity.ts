import { DomainException } from '../../../../common/exceptions/domain.exception';
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
    public readonly bytes: number | null = null,
    public readonly format: string | null = null,
    public readonly uploadedByUserId: string | null = null,
    public readonly metadata: Record<string, unknown> = {},
  ) {
    if (bytes !== null && bytes < 0) {
      throw new DomainException(
        'bytes must be greater than or equal to 0.',
        'BYTES_NEGATIVE',
      );
    }
  }
}
