import { DomainException } from '../../../../common/exceptions/domain.exception';
import { MediaOwnerType } from '../enums/media-owner-type.enum';
import { MediaResourceType } from '../enums/media-resource-type.enum';
import { MediaAsset } from './media-asset.entity';

describe('MediaAsset', () => {
  function createMediaAsset(bytes: number | null = null): MediaAsset {
    return new MediaAsset(
      'media-id',
      MediaOwnerType.ANIMAL,
      'animal-id',
      MediaResourceType.IMAGE,
      'animals/luna',
      'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
      bytes,
    );
  }

  it('accepts null bytes', () => {
    expect(createMediaAsset().bytes).toBeNull();
  });

  it('accepts zero bytes', () => {
    expect(createMediaAsset(0).bytes).toBe(0);
  });

  it('accepts positive bytes', () => {
    expect(createMediaAsset(1).bytes).toBe(1);
  });

  it('rejects negative bytes', () => {
    expect(() => createMediaAsset(-1)).toThrow(DomainException);

    try {
      createMediaAsset(-1);
    } catch (error) {
      expect((error as DomainException).code).toBe('BYTES_NEGATIVE');
    }
  });
});
