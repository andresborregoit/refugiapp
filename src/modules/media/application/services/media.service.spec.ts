import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaAssetRepository, MEDIA_ASSET_REPOSITORY } from '../../domain/repositories/media-asset.repository';
import { OwnerExistsChecker, OWNER_EXISTS_CHECKER } from '../../domain/repositories/owner-exists-checker';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/cloudinary-storage.service';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';

describe('MediaService', () => {
  let service: MediaService;
  let mediaAssetRepository: jest.Mocked<MediaAssetRepository>;
  let ownerExistsChecker: jest.Mocked<OwnerExistsChecker>;
  let cloudinaryStorageService: { getClient: jest.Mock; buildUploadFolder: jest.Mock; upload: jest.Mock; delete: jest.Mock };

  const adminUser: AuthenticatedUser = {
    id: 'user-id',
    email: 'admin@refugiapp.test',
    roles: [UserRole.ADMIN],
  };
  const veterinarianUser: AuthenticatedUser = {
    id: 'vet-user-id',
    email: 'vet@refugiapp.test',
    roles: [UserRole.VETERINARIAN],
  };

  beforeEach(async () => {
    mediaAssetRepository = {
      findById: jest.fn(),
      findByOwner: jest.fn(),
      findOrphanedOlderThan: jest.fn(),
      create: jest.fn(),
      softDeleteById: jest.fn(),
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
    it('should upload a file and create a media asset owned by an existing owner', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.create.mockImplementation(async (asset: MediaAsset) => asset);

      const result = await service.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        MediaOwnerType.ANIMAL,
        'animal-id',
        adminUser,
      );

      expect(ownerExistsChecker.exists).toHaveBeenCalledWith(MediaOwnerType.ANIMAL, 'animal-id');
      expect(result).toBeInstanceOf(MediaAsset);
      expect(result.ownerType).toBe(MediaOwnerType.ANIMAL);
      expect(result.ownerId).toBe('animal-id');
      expect(result.resourceType).toBe(MediaResourceType.IMAGE);
      expect(result.publicId).toBe('public-id');
      expect(result.uploadedByUserId).toBe('user-id');
    });

    it('should upload an orphan asset when no owner is provided', async () => {
      mediaAssetRepository.create.mockImplementation(async (asset: MediaAsset) => asset);

      const result = await service.upload(
        Buffer.from('test'),
        'test.jpg',
        'image/jpeg',
        null,
        null,
        adminUser,
      );

      expect(ownerExistsChecker.exists).not.toHaveBeenCalled();
      expect(result.ownerType).toBeNull();
      expect(result.ownerId).toBeNull();
    });

    it('should throw BadRequestException when only one of ownerType/ownerId is provided', async () => {
      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          null,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          null,
          'animal-id',
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ResourceNotFoundException when owner does not exist', async () => {
      ownerExistsChecker.exists.mockResolvedValue(false);

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          'non-existent-id',
          adminUser,
        ),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw BadRequestException for invalid mimetype', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.exe',
          'application/x-executable',
          MediaOwnerType.ANIMAL,
          'animal-id',
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a veterinarian uploading a non-clinical asset', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          'animal-id',
          veterinarianUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow a veterinarian uploading a clinical attachment', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.create.mockImplementation(async (asset: MediaAsset) => asset);

      const result = await service.upload(
        Buffer.from('test'),
        'test.pdf',
        'application/pdf',
        MediaOwnerType.MEDICAL_RECORD,
        'record-id',
        veterinarianUser,
      );

      expect(result.ownerType).toBe(MediaOwnerType.MEDICAL_RECORD);
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
          adminUser,
        ),
      ).rejects.toThrow('DB error');

      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });

    it('should propagate the database error even when Cloudinary compensation fails', async () => {
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.create.mockRejectedValue(new Error('DB error'));
      cloudinaryStorageService.delete.mockRejectedValue(new Error('compensation error'));

      await expect(
        service.upload(
          Buffer.from('test'),
          'test.jpg',
          'image/jpeg',
          MediaOwnerType.ANIMAL,
          'animal-id',
          adminUser,
        ),
      ).rejects.toThrow('DB error');

      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });
  });

  describe('listByOwner', () => {
    it('should list assets for an existing owner', async () => {
      const paginated = { items: [], page: 1, limit: 20, total: 0 };
      ownerExistsChecker.exists.mockResolvedValue(true);
      mediaAssetRepository.findByOwner.mockResolvedValue(paginated);

      const result = await service.listByOwner({
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        page: 1,
        limit: 20,
      });

      expect(ownerExistsChecker.exists).toHaveBeenCalledWith(MediaOwnerType.ANIMAL, 'animal-id');
      expect(mediaAssetRepository.findByOwner).toHaveBeenCalledWith({
        ownerType: MediaOwnerType.ANIMAL,
        ownerId: 'animal-id',
        page: 1,
        limit: 20,
      });
      expect(result).toBe(paginated);
    });

    it('should throw ResourceNotFoundException when the owner does not exist', async () => {
      ownerExistsChecker.exists.mockResolvedValue(false);

      await expect(
        service.listByOwner({
          ownerType: MediaOwnerType.ANIMAL,
          ownerId: 'missing-animal',
          page: 1,
          limit: 20,
        }),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(mediaAssetRepository.findByOwner).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const asset = new MediaAsset(
      'id',
      MediaOwnerType.ANIMAL,
      'animal-id',
      MediaResourceType.IMAGE,
      'public-id',
      'https://cloudinary.com/test.jpg',
      1024,
    );

    it('should soft-delete and remove the remote asset', async () => {
      mediaAssetRepository.findById.mockResolvedValue(asset);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);

      await service.delete('id', adminUser);

      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledWith('id');
      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });

    it('should throw ResourceNotFoundException when asset does not exist', async () => {
      mediaAssetRepository.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent-id', adminUser)).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mediaAssetRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('should reject a veterinarian deleting a non-clinical asset', async () => {
      mediaAssetRepository.findById.mockResolvedValue(asset);

      await expect(service.delete('id', veterinarianUser)).rejects.toThrow(ForbiddenException);
      expect(mediaAssetRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('should allow a veterinarian deleting a clinical attachment', async () => {
      const clinicalAsset = new MediaAsset(
        'id',
        MediaOwnerType.MEDICAL_RECORD,
        'record-id',
        MediaResourceType.IMAGE,
        'public-id',
        'https://cloudinary.com/test.jpg',
        1024,
      );
      mediaAssetRepository.findById.mockResolvedValue(clinicalAsset);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);

      await service.delete('id', veterinarianUser);

      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledWith('id');
      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });

    it('should not throw when Cloudinary cleanup fails', async () => {
      mediaAssetRepository.findById.mockResolvedValue(asset);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);
      cloudinaryStorageService.delete.mockRejectedValue(new Error('remote error'));

      await expect(service.delete('id', adminUser)).resolves.toBeUndefined();
      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledWith('id');
    });

    it('should allow a veterinarian deleting their own orphan asset', async () => {
      const ownOrphan = new MediaAsset(
        'id',
        null,
        null,
        MediaResourceType.IMAGE,
        'public-id',
        'https://cloudinary.com/test.jpg',
        1024,
        'jpg',
        veterinarianUser.id,
      );
      mediaAssetRepository.findById.mockResolvedValue(ownOrphan);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);

      await service.delete('id', veterinarianUser);

      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledWith('id');
      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-id');
    });

    it('should reject a veterinarian deleting a foreign orphan asset', async () => {
      const foreignOrphan = new MediaAsset(
        'id',
        null,
        null,
        MediaResourceType.IMAGE,
        'public-id',
        'https://cloudinary.com/test.jpg',
        1024,
        'jpg',
        'another-user-id',
      );
      mediaAssetRepository.findById.mockResolvedValue(foreignOrphan);

      await expect(service.delete('id', veterinarianUser)).rejects.toThrow(ForbiddenException);
      expect(mediaAssetRepository.softDeleteById).not.toHaveBeenCalled();
      expect(cloudinaryStorageService.delete).not.toHaveBeenCalled();
    });

    it('should reject a veterinarian deleting a linked asset owned by someone else', async () => {
      mediaAssetRepository.findById.mockResolvedValue(asset);

      await expect(service.delete('id', veterinarianUser)).rejects.toThrow(ForbiddenException);
      expect(mediaAssetRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });

  describe('purgeExpiredOrphans', () => {
    const orphan = (id: string) =>
      new MediaAsset(
        id,
        null,
        null,
        MediaResourceType.IMAGE,
        `public-${id}`,
        'https://cloudinary.com/test.jpg',
        1024,
        'jpg',
        'user-id',
      );

    it('should return matching orphans without mutating when dryRun is true', async () => {
      mediaAssetRepository.findOrphanedOlderThan.mockResolvedValue([
        orphan('orphan-1'),
        orphan('orphan-2'),
      ]);

      const result = await service.purgeExpiredOrphans({
        olderThanHours: 48,
        limit: 10,
        dryRun: true,
      });

      expect(mediaAssetRepository.findOrphanedOlderThan).toHaveBeenCalled();
      expect(mediaAssetRepository.softDeleteById).not.toHaveBeenCalled();
      expect(cloudinaryStorageService.delete).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        dryRun: true,
        candidates: ['orphan-1', 'orphan-2'],
        deleted: 0,
        failed: 0,
      });
    });

    it('should soft-delete expired orphans and remove their remote files', async () => {
      mediaAssetRepository.findOrphanedOlderThan.mockResolvedValue([
        orphan('orphan-1'),
        orphan('orphan-2'),
      ]);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);
      cloudinaryStorageService.delete.mockResolvedValue(undefined);

      const result = await service.purgeExpiredOrphans({
        olderThanHours: 48,
        limit: 10,
        dryRun: false,
      });

      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledTimes(2);
      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-orphan-1');
      expect(cloudinaryStorageService.delete).toHaveBeenCalledWith('public-orphan-2');
      expect(result).toMatchObject({ dryRun: false, deleted: 2, failed: 0 });
    });

    it('should count remote cleanup failures as failed without throwing', async () => {
      mediaAssetRepository.findOrphanedOlderThan.mockResolvedValue([orphan('orphan-1')]);
      mediaAssetRepository.softDeleteById.mockResolvedValue(undefined);
      cloudinaryStorageService.delete.mockRejectedValue(new Error('remote error'));

      const result = await service.purgeExpiredOrphans({
        olderThanHours: 48,
        limit: 10,
        dryRun: false,
      });

      expect(result).toMatchObject({ deleted: 1, failed: 1 });
      expect(mediaAssetRepository.softDeleteById).toHaveBeenCalledWith('orphan-1');
    });

    it('should count soft-delete failures as failed', async () => {
      mediaAssetRepository.findOrphanedOlderThan.mockResolvedValue([orphan('orphan-1')]);
      mediaAssetRepository.softDeleteById.mockRejectedValue(new Error('db error'));

      const result = await service.purgeExpiredOrphans({
        olderThanHours: 48,
        limit: 10,
        dryRun: false,
      });

      expect(result).toMatchObject({ deleted: 0, failed: 1 });
      expect(cloudinaryStorageService.delete).not.toHaveBeenCalled();
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