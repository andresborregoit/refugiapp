import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryStorageService, CloudinaryUploadResult } from './cloudinary-storage.service';
import { CLOUDINARY_CLIENT, CloudinaryClient } from './cloudinary.provider';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';

describe('CloudinaryStorageService', () => {
  let service: CloudinaryStorageService;
  let client: jest.Mocked<CloudinaryClient>;

  beforeEach(async () => {
    client = {
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
    } as unknown as jest.Mocked<CloudinaryClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryStorageService,
        { provide: CLOUDINARY_CLIENT, useValue: client },
      ],
    }).compile();

    service = module.get<CloudinaryStorageService>(CloudinaryStorageService);
  });

  describe('buildUploadFolder', () => {
    it('should return correct folder path', () => {
      const result = service.buildUploadFolder(MediaOwnerType.ANIMAL, 'animal-id');
      expect(result).toBe('refugiapp/animal/animal-id');
    });

    it('should handle different owner types', () => {
      expect(service.buildUploadFolder(MediaOwnerType.EXPENSE_TICKET, 'expense-id')).toBe(
        'refugiapp/expense_ticket/expense-id',
      );
      expect(service.buildUploadFolder(MediaOwnerType.MEDICAL_RECORD, 'record-id')).toBe(
        'refugiapp/medical_record/record-id',
      );
    });
  });

  describe('upload', () => {
    it('should upload a file buffer to Cloudinary', async () => {
      const mockResult: CloudinaryUploadResult = {
        publicId: 'public-id',
        secureUrl: 'https://cloudinary.com/test.jpg',
        format: 'jpg',
        bytes: 1024,
        resourceType: MediaResourceType.IMAGE,
      };

      (client.uploader.upload_stream as jest.Mock).mockImplementation(
        (options: any, callback: (error: any, result: any) => void) => {
          callback(null, {
            public_id: 'public-id',
            secure_url: 'https://cloudinary.com/test.jpg',
            format: 'jpg',
            bytes: 1024,
            resource_type: 'image',
          });
          return { end: jest.fn() };
        },
      );

      const result = await service.upload(Buffer.from('test'), {
        folder: 'test-folder',
        resourceType: MediaResourceType.IMAGE,
        allowedFormats: ['jpg', 'jpeg'],
      });

      expect(result).toEqual(mockResult);
      expect(client.uploader.upload_stream).toHaveBeenCalled();
    });

    it('should reject when Cloudinary returns an error', async () => {
      (client.uploader.upload_stream as jest.Mock).mockImplementation(
        (options: any, callback: (error: any, result: any) => void) => {
          callback(new Error('Cloudinary error'), null);
          return { end: jest.fn() };
        },
      );

      await expect(
        service.upload(Buffer.from('test'), {
          folder: 'test-folder',
          resourceType: MediaResourceType.IMAGE,
        }),
      ).rejects.toThrow('Cloudinary error');
    });
  });

  describe('delete', () => {
    it('should delete a Cloudinary asset by public id', async () => {
      (client.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await service.delete('public-id');

      expect(client.uploader.destroy).toHaveBeenCalledWith('public-id');
    });

    it('should throw when Cloudinary delete fails', async () => {
      (client.uploader.destroy as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await expect(service.delete('public-id')).rejects.toThrow('Delete failed');
    });
  });

  describe('getClient', () => {
    it('should return the Cloudinary client', () => {
      const result = service.getClient();
      expect(result).toBe(client);
    });
  });
});
