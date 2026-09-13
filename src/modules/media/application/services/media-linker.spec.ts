import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import {
  MEDIA_ALREADY_OWNED,
  MEDIA_INCOMPATIBLE_OWNER_TYPE,
  MediaLinkingContext,
} from '../../domain/services/media-owner-policy';
import { assertMediaLinkable } from './media-linker';

describe('media-linker', () => {
  function createAsset(ownerType: MediaOwnerType | null): MediaAsset {
    return new MediaAsset(
      'media-id',
      ownerType,
      ownerType === null ? null : 'owner-id',
      MediaResourceType.IMAGE,
      'public-id',
      'https://cloudinary.com/test.jpg',
      1024,
    );
  }

  it('allows linking an orphan asset', () => {
    expect(() =>
      assertMediaLinkable(createAsset(null), MediaLinkingContext.EXPENSE_TICKET),
    ).not.toThrow();
  });

  it('throws 409 INCOMPATIBLE_OWNER_TYPE for an incompatible owner', () => {
    try {
      assertMediaLinkable(createAsset(MediaOwnerType.ANIMAL), MediaLinkingContext.EXPENSE_TICKET);
      fail('Expected ResourceConflictException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceConflictException);
      expect((error as ResourceConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: MEDIA_INCOMPATIBLE_OWNER_TYPE }),
      );
    }
  });

  it('throws 409 MEDIA_ALREADY_OWNED for an asset already owned by the expected type', () => {
    try {
      assertMediaLinkable(
        createAsset(MediaOwnerType.MEDICAL_RECORD),
        MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT,
      );
      fail('Expected ResourceConflictException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ResourceConflictException);
      expect((error as ResourceConflictException).getResponse()).toEqual(
        expect.objectContaining({ code: MEDIA_ALREADY_OWNED }),
      );
    }
  });
});