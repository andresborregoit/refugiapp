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
    new Date('2026-03-10T10:00:00.000Z'),
  );
  const medicalRecordRepository = {
    findById: jest.fn(),
    create: jest.fn(),
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

      await expect(medicalRecordsServiceFindById('record-id')).resolves.toBe(record);
    });

    it('returns null when the record does not exist', async () => {
      medicalRecordRepository.findById.mockResolvedValue(null);

      await expect(medicalRecordsServiceFindById('missing-id')).resolves.toBeNull();
    });
  });

  function medicalRecordsServiceFindById(id: string) {
    return service.findById(id);
  }
});
