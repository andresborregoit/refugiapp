import { DomainException } from '../../../../common/exceptions/domain.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import {
  assertCanLinkToContext,
  MEDIA_ALREADY_OWNED,
  MEDIA_INCOMPATIBLE_OWNER_TYPE,
  MediaLinkingContext,
} from '../../domain/services/media-owner-policy';

export function assertMediaLinkable(
  asset: MediaAsset,
  context: MediaLinkingContext,
): void {
  try {
    assertCanLinkToContext(asset.ownerType, context);
  } catch (error) {
    if (
      error instanceof DomainException &&
      (error.code === MEDIA_INCOMPATIBLE_OWNER_TYPE || error.code === MEDIA_ALREADY_OWNED)
    ) {
      throw new ResourceConflictException(error.message, error.code);
    }

    throw error;
  }
}