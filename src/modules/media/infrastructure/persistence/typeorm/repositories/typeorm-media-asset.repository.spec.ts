import { Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../../../domain/enums/media-resource-type.enum';
import { MediaAssetOrmEntity } from '../entities/media-asset.orm-entity';
import { TypeOrmMediaAssetRepository } from './typeorm-media-asset.repository';

describe('TypeOrmMediaAssetRepository', () => {
  let repository: jest.Mocked<Pick<Repository<MediaAssetOrmEntity>, 'findOne'>>;
  let mediaAssetRepository: TypeOrmMediaAssetRepository;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
    };
    mediaAssetRepository = new TypeOrmMediaAssetRepository(
      repository as unknown as Repository<MediaAssetOrmEntity>,
    );
  });

  it('maps bytes to the domain entity when present', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new MediaAssetOrmEntity(), {
        id: 'media-id',
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'animals/luna',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
        bytes: 1024,
      }),
    );

    const result = await mediaAssetRepository.findById('media-id');

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'media-id' } });
    expect(result).toMatchObject({
      id: 'media-id',
      publicId: 'animals/luna',
      bytes: 1024,
    });
  });

  it('maps omitted bytes to null', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new MediaAssetOrmEntity(), {
        id: 'media-id',
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'animals/luna',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
        bytes: null,
      }),
    );

    const result = await mediaAssetRepository.findById('media-id');

    expect(result?.bytes).toBeNull();
  });

  it('returns null when not found', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(mediaAssetRepository.findById('missing-id')).resolves.toBeNull();
  });
});
