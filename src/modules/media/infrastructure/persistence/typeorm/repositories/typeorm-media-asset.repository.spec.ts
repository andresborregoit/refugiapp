import { Repository } from 'typeorm';
import { IsNull, LessThan } from 'typeorm';
import { MediaOwnerType } from '../../../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../../../domain/enums/media-resource-type.enum';
import { MediaAsset } from '../../../../domain/entities/media-asset.entity';
import { MediaAssetOrmEntity } from '../entities/media-asset.orm-entity';
import { TypeOrmMediaAssetRepository } from './typeorm-media-asset.repository';

describe('TypeOrmMediaAssetRepository', () => {
  let repository: jest.Mocked<
    Pick<Repository<MediaAssetOrmEntity>, 'findOne' | 'create' | 'save' | 'softDelete' | 'count' | 'findAndCount' | 'find'>
  >;
  let mediaAssetRepository: TypeOrmMediaAssetRepository;

  const ormAsset = Object.assign(new MediaAssetOrmEntity(), {
    id: 'media-id',
    ownerType: MediaOwnerType.ANIMAL,
    ownerId: 'animal-id',
    resourceType: MediaResourceType.IMAGE,
    cloudinaryPublicId: 'animals/luna',
    secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
    bytes: 1024,
  });

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn(),
    };
    mediaAssetRepository = new TypeOrmMediaAssetRepository(
      repository as unknown as Repository<MediaAssetOrmEntity>,
    );
  });

  it('maps bytes to the domain entity when present', async () => {
    repository.findOne.mockResolvedValue(ormAsset);

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

  it('maps an orphan asset to the domain entity', async () => {
    repository.findOne.mockResolvedValue(
      Object.assign(new MediaAssetOrmEntity(), {
        id: 'media-id',
        ownerType: null,
        ownerId: null,
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'animals/luna',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
        bytes: null,
      }),
    );

    const result = await mediaAssetRepository.findById('media-id');

    expect(result?.ownerType).toBeNull();
    expect(result?.ownerId).toBeNull();
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

    it('should create an orphan asset', async () => {
      const orphanOrmEntity = Object.assign(new MediaAssetOrmEntity(), {
        id: 'media-id',
        ownerType: null,
        ownerId: null,
        resourceType: MediaResourceType.IMAGE,
        cloudinaryPublicId: 'animals/luna',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
        bytes: 1024,
      });

      repository.create.mockReturnValue(orphanOrmEntity);
      repository.save.mockResolvedValue(orphanOrmEntity);

      const result = await mediaAssetRepository.create(
        new MediaAsset(
          'media-id',
          null,
          null,
          MediaResourceType.IMAGE,
          'animals/luna',
          'https://res.cloudinary.com/demo/image/upload/animals/luna.jpg',
          1024,
        ),
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerType: null, ownerId: null }),
      );
      expect(result.ownerType).toBeNull();
    });
  });

  describe('findByOwner', () => {
    it('should filter, paginate and order by owner', async () => {
      repository.findAndCount.mockResolvedValue([[ormAsset], 5]);

      const result = await mediaAssetRepository.findByOwner({
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        page: 2,
        limit: 2,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
      });
      expect(options.order).toEqual({ createdAt: 'DESC', id: 'DESC' });
      expect(options.skip).toBe(2);
      expect(options.take).toBe(2);
      expect(options.withDeleted).toBeUndefined();
      expect(result).toMatchObject({ page: 2, limit: 2, total: 5 });
      expect(result.items[0]).toMatchObject({ id: 'media-id' });
    });
  });

  describe('findOrphanedOlderThan', () => {
    it('filters orphan assets older than the threshold, ordered and limited', async () => {
      repository.find.mockResolvedValue([ormAsset]);

      const threshold = new Date('2025-01-01T00:00:00.000Z');
      const result = await mediaAssetRepository.findOrphanedOlderThan(threshold, 25);

      const options = repository.find.mock.calls[0]![0]!;
      expect(options.where).toEqual({
        ownerType: IsNull(),
        ownerId: IsNull(),
        createdAt: LessThan(threshold),
      });
      expect(options.order).toEqual({ createdAt: 'ASC', id: 'ASC' });
      expect(options.take).toBe(25);
      expect(options.withDeleted).toBeUndefined();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'media-id' });
    });

    it('maps orphan rows back to domain assets', async () => {
      repository.find.mockResolvedValue([
        Object.assign(new MediaAssetOrmEntity(), {
          id: 'orphan-id',
          ownerType: null,
          ownerId: null,
          resourceType: MediaResourceType.IMAGE,
          cloudinaryPublicId: 'refugiapp/orphan/pic',
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/refugiapp/orphan/pic.jpg',
          bytes: 512,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        }),
      ]);

      const result = await mediaAssetRepository.findOrphanedOlderThan(
        new Date('2025-01-01T00:00:00.000Z'),
        10,
      );

      expect(result[0]).toMatchObject({
        id: 'orphan-id',
        ownerType: null,
        ownerId: null,
        publicId: 'refugiapp/orphan/pic',
      });
      expect(result[0]?.isOrphan()).toBe(true);
    });
  });

  describe('softDeleteById', () => {
    it('should apply soft delete by id', async () => {
      repository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await mediaAssetRepository.softDeleteById('media-id');

      expect(repository.softDelete).toHaveBeenCalledWith({ id: 'media-id' });
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