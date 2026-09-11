import { BadRequestException } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { Animal } from '../../../animals/domain/entities/animal.entity';
import { AnimalSex } from '../../../animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { MedicalRecordType } from '../../domain/enums/medical-record-type.enum';
import { MedicalRecord } from '../../domain/entities/medical-record.entity';
import { VeterinarianRepository } from '../../../veterinarians/domain/repositories/veterinarian.repository';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { CreateMedicalRecordDto } from '../../interfaces/dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from '../../interfaces/dto/update-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

describe('MedicalRecordsService', () => {
  const animal = new Animal(
    'animal-id',
    'Luna',
    'dog',
    'mixed',
    AnimalSex.FEMALE,
    AnimalStatus.ADMITTED,
    new Date('2026-01-01'),
  );
  const now = new Date('2026-03-10T10:00:00.000Z');
  const record = new MedicalRecord(
    'record-id',
    'animal-id',
    MedicalRecordType.CONSULTATION,
    'Annual checkup',
    new Date('2026-03-10T10:00:00.000Z'),
    'vet-id',
    'Healthy',
    null,
    'No issues',
    now,
    now,
    null,
  );
  const deletedRecord = new MedicalRecord(
    'record-id',
    'animal-id',
    MedicalRecordType.CONSULTATION,
    'Annual checkup',
    new Date('2026-03-10T10:00:00.000Z'),
    'vet-id',
    'Healthy',
    null,
    'No issues',
    now,
    now,
    new Date('2026-04-01T00:00:00.000Z'),
  );
  const medicalRecordRepository = {
    findById: jest.fn(),
    findByIdWithDeleted: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
  const animalRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    changeStatus: jest.fn(),
  };
  const veterinarianRepository = {
    findById: jest.fn(),
  };
  const mediaAssetRepository = {
    findById: jest.fn(),
  };
  let service: MedicalRecordsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MedicalRecordsService(
      medicalRecordRepository,
      animalRepository,
      veterinarianRepository as unknown as VeterinarianRepository,
      mediaAssetRepository as unknown as MediaAssetRepository,
    );
  });

  function createDto(overrides: Partial<CreateMedicalRecordDto> = {}): CreateMedicalRecordDto {
    return Object.assign(new CreateMedicalRecordDto(), {
      animalId: 'animal-id',
      recordType: MedicalRecordType.CONSULTATION,
      title: '  Annual checkup  ',
      occurredAt: '2026-03-10T10:00:00.000Z',
      ...overrides,
    });
  }

  function updateDto(overrides: Partial<UpdateMedicalRecordDto> = {}): UpdateMedicalRecordDto {
    return Object.assign(new UpdateMedicalRecordDto(), {
      title: '  Updated title  ',
      ...overrides,
    });
  }

  describe('create', () => {
    it('creates a record with trimmed fields and default null optionals', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      medicalRecordRepository.create.mockResolvedValue(record);

      const result = await service.create(createDto());

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(veterinarianRepository.findById).not.toHaveBeenCalled();
      expect(mediaAssetRepository.findById).not.toHaveBeenCalled();
      expect(medicalRecordRepository.create).toHaveBeenCalledWith(
        expect.any(Object),
      );
      const input = medicalRecordRepository.create.mock.calls[0]![0];

      expect(input).toMatchObject({
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Annual checkup',
        veterinarianId: null,
        diagnosis: null,
        treatment: null,
        notes: null,
        attachmentMediaIds: [],
      });
      expect(input.occurredAt).toBeInstanceOf(Date);
      expect(result).toBe(record);
    });

    it('creates a record with all optional fields populated', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      veterinarianRepository.findById.mockResolvedValue({ id: 'vet-id', isActive: true });
      mediaAssetRepository.findById.mockResolvedValue({ id: 'media-id' });
      medicalRecordRepository.create.mockResolvedValue(record);

      await service.create(
        createDto({
          veterinarianId: 'vet-id',
          diagnosis: '  Healthy  ',
          treatment: '  None  ',
          notes: '  No issues  ',
          attachmentMediaIds: ['media-id'],
        }),
      );

      expect(veterinarianRepository.findById).toHaveBeenCalledWith('vet-id');
      expect(mediaAssetRepository.findById).toHaveBeenCalledWith('media-id');
      const input = medicalRecordRepository.create.mock.calls[0]![0];

      expect(input).toMatchObject({
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: 'None',
        notes: 'No issues',
        attachmentMediaIds: ['media-id'],
      });
    });

    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(service.create(createDto({ animalId: 'missing-id' }))).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(medicalRecordRepository.create).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the veterinarian does not exist', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      veterinarianRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(createDto({ veterinarianId: 'missing-vet' })),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(medicalRecordRepository.create).not.toHaveBeenCalled();
    });

    it('throws VETERINARIAN_INACTIVE when the veterinarian is deactivated', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      veterinarianRepository.findById.mockResolvedValue({ id: 'vet-id', isActive: false });

      await expect(
        service.create(createDto({ veterinarianId: 'vet-id' })),
      ).rejects.toThrow(ResourceConflictException);

      try {
        await service.create(createDto({ veterinarianId: 'vet-id' }));
      } catch (error) {
        expect((error as ResourceConflictException).getResponse()).toEqual(
          expect.objectContaining({ code: 'VETERINARIAN_INACTIVE' }),
        );
      }
    });

    it('throws OCCURRED_AT_IN_FUTURE for a future date', async () => {
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.create(createDto({ occurredAt: '2099-01-01T00:00:00.000Z' })),
      ).rejects.toThrow();
    });

    it('throws OCCURRED_AT_BEFORE_INTAKE for a date before intakeDate', async () => {
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.create(createDto({ occurredAt: '2025-01-01T00:00:00.000Z' })),
      ).rejects.toThrow();
    });

    it('throws ResourceNotFoundException when an attachment media asset does not exist', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(createDto({ attachmentMediaIds: ['missing-media'] })),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(medicalRecordRepository.create).not.toHaveBeenCalled();
    });

    it('validates all attachment media assets before creating', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      mediaAssetRepository.findById
        .mockResolvedValueOnce({ id: 'media-1' })
        .mockResolvedValueOnce(null);
      medicalRecordRepository.create.mockResolvedValue(record);

      await expect(
        service.create(
          createDto({ attachmentMediaIds: ['media-1', 'missing-media'] }),
        ),
      ).rejects.toThrow(ResourceNotFoundException);

      expect(mediaAssetRepository.findById).toHaveBeenCalledTimes(2);
      expect(medicalRecordRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns the record when it exists', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);

      await expect(service.findById('record-id')).resolves.toBe(record);
    });

    it('returns null when the record does not exist', async () => {
      medicalRecordRepository.findById.mockResolvedValue(null);

      await expect(service.findById('missing-id')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('updates a record with trimmed fields', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      const updatedRecord = new MedicalRecord(
        'record-id',
        'animal-id',
        MedicalRecordType.CONSULTATION,
        'Updated title',
        new Date('2026-03-10T10:00:00.000Z'),
        'vet-id',
        'Healthy',
        null,
        'No issues',
        now,
        now,
        null,
      );
      medicalRecordRepository.update.mockResolvedValue(updatedRecord);

      const result = await service.update('record-id', updateDto(), 'actor-id');

      expect(medicalRecordRepository.findById).toHaveBeenCalledWith('record-id');
      expect(medicalRecordRepository.update).toHaveBeenCalledWith(
        'record-id',
        expect.objectContaining({ title: 'Updated title', changedByUserId: 'actor-id' }),
      );
      expect(result).toBe(updatedRecord);
    });

    it('validates veterinarian when provided', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      veterinarianRepository.findById.mockResolvedValue({ id: 'new-vet', isActive: true });
      medicalRecordRepository.update.mockResolvedValue(record);

      await service.update('record-id', updateDto({ veterinarianId: 'new-vet' }), 'actor-id');

      expect(veterinarianRepository.findById).toHaveBeenCalledWith('new-vet');
    });

    it('throws ResourceNotFoundException when the record does not exist', async () => {
      medicalRecordRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('missing-id', updateDto(), 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(medicalRecordRepository.update).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when veterinarian does not exist', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      veterinarianRepository.findById.mockResolvedValue(null);

      await expect(
        service.update('record-id', updateDto({ veterinarianId: 'missing-vet' }), 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(medicalRecordRepository.update).not.toHaveBeenCalled();
    });

    it('throws VETERINARIAN_INACTIVE when the veterinarian is deactivated', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      veterinarianRepository.findById.mockResolvedValue({ id: 'inactive-vet', isActive: false });

      await expect(
        service.update('record-id', updateDto({ veterinarianId: 'inactive-vet' }), 'actor-id'),
      ).rejects.toThrow(ResourceConflictException);
    });

    it('validates occurredAt against intakeDate when provided', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.update('record-id', updateDto({ occurredAt: '2025-01-01T00:00:00.000Z' }), 'actor-id'),
      ).rejects.toThrow();
      expect(medicalRecordRepository.update).not.toHaveBeenCalled();
    });

    it('validates occurredAt against future when provided', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.update('record-id', updateDto({ occurredAt: '2099-01-01T00:00:00.000Z' }), 'actor-id'),
      ).rejects.toThrow();
      expect(medicalRecordRepository.update).not.toHaveBeenCalled();
    });

    it('allows null veterinarianId to unlink veterinarian', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      medicalRecordRepository.update.mockResolvedValue(record);

      await service.update('record-id', updateDto({ veterinarianId: null }), 'actor-id');

      expect(veterinarianRepository.findById).not.toHaveBeenCalled();
      expect(medicalRecordRepository.update).toHaveBeenCalledWith(
        'record-id',
        expect.objectContaining({ veterinarianId: null }),
      );
    });

    it('throws ResourceNotFoundException when repository returns null', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      medicalRecordRepository.update.mockResolvedValue(null);

      await expect(
        service.update('record-id', updateDto(), 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('softDelete', () => {
    it('soft-deletes an existing record', async () => {
      medicalRecordRepository.findById.mockResolvedValue(record);
      medicalRecordRepository.softDelete.mockResolvedValue(undefined);

      await service.softDelete('record-id', 'actor-id');

      expect(medicalRecordRepository.findById).toHaveBeenCalledWith('record-id');
      expect(medicalRecordRepository.softDelete).toHaveBeenCalledWith('record-id', 'actor-id');
    });

    it('throws ResourceNotFoundException when the record does not exist', async () => {
      medicalRecordRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('missing-id', 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(medicalRecordRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('restores a soft-deleted record', async () => {
      medicalRecordRepository.findByIdWithDeleted.mockResolvedValue(deletedRecord);
      medicalRecordRepository.restore.mockResolvedValue(record);

      const result = await service.restore('record-id', 'actor-id');

      expect(medicalRecordRepository.findByIdWithDeleted).toHaveBeenCalledWith('record-id');
      expect(medicalRecordRepository.restore).toHaveBeenCalledWith('record-id', 'actor-id');
      expect(result).toBe(record);
    });

    it('throws ResourceNotFoundException when the record does not exist', async () => {
      medicalRecordRepository.findByIdWithDeleted.mockResolvedValue(null);

      await expect(service.restore('missing-id', 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(medicalRecordRepository.restore).not.toHaveBeenCalled();
    });

    it('throws RECORD_NOT_DELETED when the record is not deleted', async () => {
      medicalRecordRepository.findByIdWithDeleted.mockResolvedValue(record);

      await expect(service.restore('record-id', 'actor-id')).rejects.toThrow(
        ResourceConflictException,
      );

      try {
        await service.restore('record-id', 'actor-id');
      } catch (error) {
        expect((error as ResourceConflictException).getResponse()).toEqual(
          expect.objectContaining({ code: 'RECORD_NOT_DELETED' }),
        );
      }
      expect(medicalRecordRepository.restore).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when repository returns null', async () => {
      medicalRecordRepository.findByIdWithDeleted.mockResolvedValue(deletedRecord);
      medicalRecordRepository.restore.mockResolvedValue(null);

      await expect(service.restore('record-id', 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('listByAnimal', () => {
    it('throws ResourceNotFoundException when the animal does not exist', async () => {
      animalRepository.findById.mockResolvedValue(null);

      await expect(
        service.listByAnimal('missing-id', { page: 1, limit: 20 }),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(medicalRecordRepository.findMany).not.toHaveBeenCalled();
    });

    it('delegates to the repository after confirming the animal exists', async () => {
      animalRepository.findById.mockResolvedValue(animal);
      const paginated = { items: [record], page: 2, limit: 10, total: 1 };
      medicalRecordRepository.findMany.mockResolvedValue(paginated);

      const result = await service.listByAnimal('animal-id', {
        page: 2,
        limit: 10,
        recordType: MedicalRecordType.VACCINATION,
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
      });

      expect(animalRepository.findById).toHaveBeenCalledWith('animal-id');
      expect(medicalRecordRepository.findMany).toHaveBeenCalledWith({
        animalId: 'animal-id',
        page: 2,
        limit: 10,
        recordType: MedicalRecordType.VACCINATION,
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.000Z'),
      });
      expect(result).toBe(paginated);
    });

    it('throws BadRequestException when from is after to', async () => {
      animalRepository.findById.mockResolvedValue(animal);

      await expect(
        service.listByAnimal('animal-id', {
          page: 1,
          limit: 20,
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(medicalRecordRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('delegates to the repository without animalId filter', async () => {
      const paginated = { items: [record], page: 1, limit: 20, total: 1 };
      medicalRecordRepository.findMany.mockResolvedValue(paginated);

      const result = await service.list({
        page: 1,
        limit: 20,
      });

      expect(medicalRecordRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        recordType: undefined,
        from: undefined,
        to: undefined,
      });
      expect(result).toBe(paginated);
    });

    it('applies filters when provided', async () => {
      medicalRecordRepository.findMany.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

      await service.list({
        page: 1,
        limit: 20,
        recordType: MedicalRecordType.CONSULTATION,
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-31T23:59:59.000Z',
      });

      expect(medicalRecordRepository.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        recordType: MedicalRecordType.CONSULTATION,
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.000Z'),
      });
    });

    it('throws BadRequestException when from is after to', async () => {
      await expect(
        service.list({
          page: 1,
          limit: 20,
          from: '2026-04-01T00:00:00.000Z',
          to: '2026-03-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(medicalRecordRepository.findMany).not.toHaveBeenCalled();
    });
  });
});
