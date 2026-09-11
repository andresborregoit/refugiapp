import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaAssetRepository, MEDIA_ASSET_REPOSITORY } from '../../domain/repositories/media-asset.repository';
import { OwnerExistsChecker, OWNER_EXISTS_CHECKER } from '../../domain/repositories/owner-exists-checker';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/cloudinary-storage.service';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import { MediaAsset } from '../../domain/entities/media-asset.entity';

describe('MediaService', () => {
  let service: MediaService;
  let mediaAssetRepository: jest.Mocked<MediaAssetRepository>;
  let ownerExistsChecker: jest.Mocked<OwnerExistsChecker>;
  let cloudinaryStorageService: { getClient: jest.Mock; buildUploadFolder: jest.Mock; upload: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    mediaAssetRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      deleteByPublicId: jest.fn(),
      existsByPublicId: jest.fn(),
    };

    ownerExistsChecker = {
      exists: jest.fn(),
    };

    cloudinaryStorageService = {
      getClient: jest.fn(),
      buildUploadFolder: jest.fn().mockReturnValue('refugiapp/animal/test-id'),
      upload: jest.fn().mockResolvedValue({
        publicId: 'public-id',
        secureUrl: 'https://cloudinary.com/test.jpg',
        format: 'jpg',
        bytes: 1024,
        resourceType: MediaResourceType.IMAGE,
      }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: MEDIA_ASSET_REPOSITORY, useValue: mediaAssetRepository },
        { provide: OWNER_EXISTS_CHECKER, useValue: ownerExistsChecker },
        { provide: CloudinaryStorageService, useValue: cloudinaryStorageService as unknown as CloudinaryStorageService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe('upload', () => {
    it('should upload a file and create a media asset', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.create.mockImplementation(async (asset: MediaAsset) => asset);

      const result = await service.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        MediaOwnerType.ANIMAL,
        'animal-id',
        'user-id',
      );

      expect(result).toBeInstanceOf(MediaAsset);
      expect(result.ownerType).toBe(MediaOwnerType.ANIMAL);
      expect(result.ownerId).toBe('animal-id');
      expect(result.resourceType).toBe(MediaResourceType.IMAGE);
      expect(result.publicId).toBe('public-id');
      expect(result.secureUrl).toBe('https://cloudinary.com/test.jpg');
      expect(result.bytes).toBe(1024);
      expect(result.format).toBe('jpg');
      expect(result.uploadedByUserId).toBe('user-id');
    });

    it('should throw BadRequestException for invalid mimetype', async () => {
      await expect(
        service.upload(
          Buffer.from('test'),
          'test.exe',
          'application/x-executable',
          MediaOwnerType.ANIMAL,
          'animal-id',
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when owner does not exist', async () => {
      ownerExistsChecker.exists.mockResolvedValue(false);

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          'non-existent-id',
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete Cloudinary asset if PostgreSQL persistence fails', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          'animal-id',
          'user-id',
        ),
      ).rejects.toThrow('DB error');

      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });
  });

  describe('delete', () => {
    it('should delete a media asset from Cloudinary and database', async () => {
      const asset = new MediaAsset(
        'id',
        MediaOwnerType.ANIMAL,
        'animal-id',
        MediaResourceType.IMAGE,
        'public-id',
        'https://cloudinary.com/test.jpg',
        1024,
      );
      mediaAssetRepository.findById.mockResolvedValue(asset);
      mediaAssetRepository.deleteByPublicId.mockResolvedValue(undefined);

      await service.delete('id');

      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
      expect(mediaAssetRepository.deleteByPublicId).toHaveBeenCalledWith('public-id');
    });

    it('should throw BadRequestException when asset does not exist', async () => {
      mediaAssetRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return a media asset by id', async () => {
      const asset = new MediaAsset(
        'id',
        MediaOwnerType.ANIMAL,
        'animal-id',
        MediaResourceType.IMAGE,
        'public-id',
        'https://cloudinary.com/test.jpg',
        1024,
      );
      mediaAssetRepository.findById.mockResolvedValue(asset);

      const result = await service.findById('id');

      expect(result).toBe(asset);
    });

    it('should return null when not found', async () => {
      mediaAssetRepository.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
