import { validate } from 'class-validator';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import { CreateMediaAssetDto } from './create-media-asset.dto';

describe('CreateMediaAssetDto', () => {
  function createDto(overrides: Partial<CreateMediaAssetDto> = {}): CreateMediaAssetDto {
    return Object.assign(new CreateMediaAssetDto(), {
      ownerType: MediaOwnerType.ANIMAL,
      ownerId: '11111111-1111-4111-8111-111111111111',
      resourceType: MediaResourceType.IMAGE,
      cloudinaryPublicId: 'animals/luna',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
      ...overrides,
    });
  }

  it('accepts omitted bytes', async () => {
    const errors = await validate(createDto());

    expect(errors).toHaveLength(0);
  });

  it('accepts zero bytes', async () => {
    const errors = await validate(createDto({ bytes: 0 }));

    expect(errors).toHaveLength(0);
  });

  it('accepts positive bytes', async () => {
    const errors = await validate(createDto({ bytes: 1 }));

    expect(errors).toHaveLength(0);
  });

  it('rejects negative bytes', async () => {
    const errors = await validate(createDto({ bytes: -1 }));

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'bytes',
          constraints: expect.objectContaining({ min: expect.any(String) }),
        }),
      ]),
    );
  });
});
