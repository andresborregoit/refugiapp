import { DomainException } from '../../../../common/exceptions/domain.exception';
import { MediaOwnerType } from '../enums/media-owner-type.enum';

export const MEDIA_INCOMPATIBLE_OWNER_TYPE = 'INCOMPATIBLE_OWNER_TYPE';
export const MEDIA_ALREADY_OWNED = 'MEDIA_ALREADY_OWNED';

export enum MediaLinkingContext {
  ANIMAL_PROFILE_PHOTO = 'animal_profile_photo',
  EXPENSE_TICKET = 'expense_ticket',
  MEDICAL_RECORD_ATTACHMENT = 'medical_record_attachment',
}

export const EXPECTED_OWNER_TYPES: Record<
  MediaLinkingContext,
  ReadonlyArray<MediaOwnerType>
> = {
  [MediaLinkingContext.ANIMAL_PROFILE_PHOTO]: [MediaOwnerType.ANIMAL],
  [MediaLinkingContext.EXPENSE_TICKET]: [MediaOwnerType.EXPENSE_TICKET],
  [MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT]: [MediaOwnerType.MEDICAL_RECORD],
};

export function assertCanLinkToContext(
  assetOwnerType: MediaOwnerType | null,
  context: MediaLinkingContext,
): void {
  if (assetOwnerType === null) {
    return;
  }

  if (!EXPECTED_OWNER_TYPES[context].includes(assetOwnerType)) {
    throw new DomainException(
      `Media asset owned by ${assetOwnerType} cannot be linked as ${context}.`,
      MEDIA_INCOMPATIBLE_OWNER_TYPE,
    );
  }

  throw new DomainException(
    `Media asset is already owned by another ${assetOwnerType} and cannot be re-linked.`,
    MEDIA_ALREADY_OWNED,
  );
}