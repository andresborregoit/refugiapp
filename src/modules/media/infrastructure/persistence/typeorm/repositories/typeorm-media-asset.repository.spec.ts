import { Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../../../domain/enums/media-resource-type.enum';
import { MediaAsset } from '../../../../domain/entities/media-asset.entity';
import { MediaAssetOrmEntity } from '../entities/media-asset.orm-entity';
import { TypeOrmMediaAssetRepository } from './typeorm-media-asset.repository';

describe('TypeOrmMediaAssetRepository', () => {
  let repository: jest.Mocked<Pick<Repository<MediaAssetOrmEntity>, 'findOne' | 'create' | 'save' | 'delete' | 'count'>>;
  let mediaAssetRepository: TypeOrmMediaAssetRepository;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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

  describe('create', () => {
    it('should create and return a media asset', async () => {
      const ormEntity = Object.assign(new MediaAssetOrmEntity(), {
        id: 'media-id',
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'animals/luna',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
        bytes: 1024,
        format: 'jpg',
        uploadedByUserId: 'user-id',
        metadata: { originalFilename: 'test.jpg' },
      });

      repository.create.mockReturnValue(ormEntity);
      repository.save.mockResolvedValue(ormEntity);

      const result = await mediaAssetRepository.create(
        new MediaAsset(
          'media-id',
          MediaOwnerType.ANIMAL,
          'animal-id',
          MediaResourceType.IMAGE,
          'animals/luna',
          'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
          1024,
          'jpg',
          'user-id',
          { originalFilename: 'test.jpg' },
        ),
      );

      expect(result).toMatchObject({
        id: 'media-id',
        publicId: 'animals/luna',
        bytes: 1024,
        format: 'jpg',
      });
    });
  });

  describe('deleteByPublicId', () => {
    it('should delete a media asset by public id', async () => {
      repository.delete.mockResolvedValue({ affected: 1 } as any);

      await mediaAssetRepository.deleteByPublicId('animals/luna');

      expect(repository.delete).toHaveBeenCalledWith({ cloudinaryPublicId: 'animals/luna' });
    });
  });

  describe('existsByPublicId', () => {
    it('should return true when asset exists', async () => {
      repository.count.mockResolvedValue(1);

      const result = await mediaAssetRepository.existsByPublicId('animals/luna');

      expect(result).toBe(true);
    });

    it('should return false when asset does not exist', async () => {
      repository.count.mockResolvedValue(0);

      const result = await mediaAssetRepository.existsByPublicId('animals/luna');

      expect(result).toBe(false);
    });
  });
});
