import { In, Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../../../modules/media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../../modules/media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { CreateMedicalRecord } from '../../../../domain/entities/create-medical-record.entity';
import { UpdateMedicalRecord } from '../../../../domain/entities/update-medical-record.entity';
import { MedicalRecordType } from '../../../../domain/enums/medical-record-type.enum';
import { MedicalRecordChangeType } from '../../../../domain/enums/medical-record-change-type.enum';
import { MedicalRecordOrmEntity } from '../entities/medical-record.orm-entity';
import { MedicalRecordChangeOrmEntity } from '../entities/medical-record-change.orm-entity';
import { TypeOrmMedicalRecordRepository } from './typeorm-medical-record.repository';

describe('TypeOrmMedicalRecordRepository', () => {
  const transactionManager = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
  };
  let repository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let mediaAssetRepository: {
    update: jest.Mock;
  };
  let changeRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let medicalRecordRepository: TypeOrmMedicalRecordRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    transactionManager.create.mockImplementation(
      (target: new () => object, data: object) => Object.assign(new target(), data),
    );
    transactionManager.save.mockImplementation(async (entity: { id?: string }) => {
      if (!entity.id) {
        entity.id = 'generated-record-id';
      }

      return entity;
    });
    transactionManager.softDelete.mockResolvedValue(undefined);
    transactionManager.findOne.mockResolvedValue(null);
    repository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      manager: {
        transaction: jest
          .fn()
          .mockImplementation(
            async (run: (manager: unknown) => Promise<unknown>) => run(transactionManager),
          ),
      },
    };
    mediaAssetRepository = {
      update: jest.fn(),
    };
    changeRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    medicalRecordRepository = new TypeOrmMedicalRecordRepository(
      repository as unknown as Repository<MedicalRecordOrmEntity>,
      mediaAssetRepository as unknown as Repository<MediaAssetOrmEntity>,
      changeRepository as unknown as Repository<MedicalRecordChangeOrmEntity>,
    );
  });

  describe('create', () => {
    it('saves the medical record in a transaction', async () => {
      const input = new CreateMedicalRecord(
        'animal-id',
        MedicalRecordType.CONSULTATION,
        'Annual checkup',
        new Date('2026-03-10T10:00:00.000Z'),
        'vet-id',
        'Healthy',
        null,
        'No issues',
      );

      const result = await medicalRecordRepository.create(input);

      expect(repository.manager.transaction).toHaveBeenCalled();
      expect(transactionManager.create).toHaveBeenCalledWith(
        MedicalRecordOrmEntity,
        {
          animalId: 'animal-id',
          recordType: MedicalRecordType.CONSULTATION,
          title: 'Annual checkup',
          occurredAt: new Date('2026-03-10T10:00:00.000Z'),
          veterinarianId: 'vet-id',
          diagnosis: 'Healthy',
          treatment: null,
          notes: 'No issues',
        },
      );
      expect(transactionManager.save).toHaveBeenCalledTimes(1);
      expect(transactionManager.update).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'generated-record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Annual checkup',
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: null,
        notes: 'No issues',
      });
    });

    it('links attachments to the created record within the transaction', async () => {
      const input = new CreateMedicalRecord(
        'animal-id',
        MedicalRecordType.VACCINATION,
        'Rabies vaccine',
        new Date('2026-03-10T10:00:00.000Z'),
        null,
        null,
        null,
        null,
        ['media-1', 'media-2'],
      );

      await medicalRecordRepository.create(input);

      expect(transactionManager.update).toHaveBeenCalledWith(
        MediaAssetOrmEntity,
        { id: In(['media-1', 'media-2']) },
        { ownerType: MediaOwnerType.MEDICAL_RECORD, ownerId: 'generated-record-id' },
      );
    });

    it('does not update media assets when there are no attachments', async () => {
      const input = new CreateMedicalRecord(
        'animal-id',
        MedicalRecordType.CONSULTATION,
        'Checkup',
        new Date('2026-03-10T10:00:00.000Z'),
        null,
        null,
        null,
        null,
        [],
      );

      await medicalRecordRepository.create(input);

      expect(transactionManager.update).not.toHaveBeenCalled();
    });

    it('stores null optional fields when they are not informed', async () => {
      const input = new CreateMedicalRecord(
        'animal-id',
        MedicalRecordType.OTHER,
        'Misc',
        new Date('2026-03-10T10:00:00.000Z'),
        null,
        null,
        null,
        null,
      );

      await medicalRecordRepository.create(input);

      const data = transactionManager.create.mock.calls[0]![1] as Record<string, unknown>;

      expect(data).toMatchObject({
        veterinarianId: null,
        diagnosis: null,
        treatment: null,
        notes: null,
      });
    });
  });

  describe('findById', () => {
    it('returns a mapped record when found', async () => {
      const ormEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Checkup',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: null,
        notes: 'Good',
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: null,
      });
      repository.findOne.mockResolvedValue(ormEntity);

      const result = await medicalRecordRepository.findById('record-id');

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'record-id' } });
      expect(result).toMatchObject({
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Checkup',
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: null,
        notes: 'Good',
      });
      expect(result!.updatedAt).toBeDefined();
      expect(result!.deletedAt).toBeNull();
    });

    it('returns null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(medicalRecordRepository.findById('missing-id')).resolves.toBeNull();
    });
  });

  describe('findByIdWithDeleted', () => {
    it('uses withDeleted option when querying', async () => {
      const ormEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Checkup',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: null,
        diagnosis: null,
        treatment: null,
        notes: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: new Date('2026-04-01T00:00:00.000Z'),
      });
      repository.findOne.mockResolvedValue(ormEntity);

      const result = await medicalRecordRepository.findByIdWithDeleted('record-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'record-id' },
        withDeleted: true,
      });
      expect(result!.deletedAt).toBeDefined();
    });

    it('returns null when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(medicalRecordRepository.findByIdWithDeleted('missing-id')).resolves.toBeNull();
    });
  });

  describe('findMany', () => {
    it('filters by animalId, recordType and date range with reverse chronological order', async () => {
      const ormEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.VACCINATION,
        title: 'Rabies vaccine',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: null,
        diagnosis: null,
        treatment: null,
        notes: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: null,
      });
      repository.findAndCount.mockResolvedValue([[ormEntity], 5]);

      const result = await medicalRecordRepository.findMany({
        animalId: 'animal-id',
        page: 2,
        limit: 2,
        recordType: MedicalRecordType.VACCINATION,
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.000Z'),
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toMatchObject({
        animalId: 'animal-id',
        recordType: MedicalRecordType.VACCINATION,
      });
      expect(options.where.occurredAt).toBeDefined();
      expect(options.order).toEqual({ occurredAt: 'DESC', id: 'DESC' });
      expect(options.skip).toBe(2);
      expect(options.take).toBe(2);
      expect(options.withDeleted).toBeUndefined();
      expect(result).toMatchObject({ page: 2, limit: 2, total: 5 });
      expect(result.items[0]).toMatchObject({
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.VACCINATION,
      });
    });

    it('filters only by animalId when optional filters are omitted', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await medicalRecordRepository.findMany({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
      });

      const options = repository.findAndCount.mock.calls[0]![0]!;

      expect(options.where).toEqual({ animalId: 'animal-id' });
    });

    it('supports one-sided date ranges', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await medicalRecordRepository.findMany({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
        from: new Date('2026-03-01T00:00:00.000Z'),
      });
      await medicalRecordRepository.findMany({
        animalId: 'animal-id',
        page: 1,
        limit: 20,
        to: new Date('2026-03-31T23:59:59.000Z'),
      });

      expect(repository.findAndCount.mock.calls[0]![0]!.where.occurredAt).toBeDefined();
      expect(repository.findAndCount.mock.calls[1]![0]!.where.occurredAt).toBeDefined();
    });
  });

  describe('update', () => {
    it('applies only defined fields and persists a change record', async () => {
      const existingEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Old title',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'vet-id',
        diagnosis: 'Old diagnosis',
        treatment: null,
        notes: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: null,
      });
      transactionManager.findOne.mockResolvedValue(existingEntity);

      const input = new UpdateMedicalRecord('actor-id', undefined, 'New title');

      const result = await medicalRecordRepository.update('record-id', input);

      expect(transactionManager.findOne).toHaveBeenCalledWith(MedicalRecordOrmEntity, {
        where: { id: 'record-id' },
      });
      expect(existingEntity.title).toBe('New title');
      expect(existingEntity.recordType).toBe(MedicalRecordType.CONSULTATION);
      expect(transactionManager.save).toHaveBeenNthCalledWith(1, MedicalRecordOrmEntity, existingEntity);
      expect(transactionManager.create).toHaveBeenCalledWith(
        MedicalRecordChangeOrmEntity,
        expect.objectContaining({
          medicalRecordId: 'record-id',
          changedByUserId: 'actor-id',
          changeType: MedicalRecordChangeType.UPDATE,
          previousValues: { title: 'Old title' },
        }),
      );
      expect(result).toBeDefined();
    });

    it('returns null when the record does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      const input = new UpdateMedicalRecord('actor-id', undefined, 'New title');

      await expect(medicalRecordRepository.update('missing-id', input)).resolves.toBeNull();
    });

    it('records previous values for all changed fields', async () => {
      const existingEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Old title',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'old-vet',
        diagnosis: 'Old diag',
        treatment: 'Old treat',
        notes: 'Old notes',
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: null,
      });
      transactionManager.findOne.mockResolvedValue(existingEntity);

      const input = new UpdateMedicalRecord(
        'actor-id',
        MedicalRecordType.VACCINATION,
        'New title',
        new Date('2026-04-01T00:00:00.000Z'),
        'new-vet',
        'New diag',
        'New treat',
        'New notes',
      );

      await medicalRecordRepository.update('record-id', input);

      const changeCall = transactionManager.create.mock.calls.find(
        (call) => call[0] === MedicalRecordChangeOrmEntity,
      );
      const changeData = changeCall![1] as Record<string, unknown>;

      expect(changeData.previousValues).toEqual({
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Old title',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'old-vet',
        diagnosis: 'Old diag',
        treatment: 'Old treat',
        notes: 'Old notes',
      });
    });
  });

  describe('softDelete', () => {
    it('soft-deletes the record and persists a change record', async () => {
      const existingEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Checkup',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: null,
        notes: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: null,
      });
      transactionManager.findOne.mockResolvedValue(existingEntity);

      await medicalRecordRepository.softDelete('record-id', 'actor-id');

      expect(transactionManager.softDelete).toHaveBeenCalledWith(MedicalRecordOrmEntity, 'record-id');
      expect(transactionManager.create).toHaveBeenCalledWith(
        MedicalRecordChangeOrmEntity,
        expect.objectContaining({
          medicalRecordId: 'record-id',
          changedByUserId: 'actor-id',
          changeType: MedicalRecordChangeType.SOFT_DELETE,
        }),
      );
    });

    it('does nothing when the record does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await medicalRecordRepository.softDelete('missing-id', 'actor-id');

      expect(transactionManager.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('restores the record and persists a change record', async () => {
      const deletedEntity = Object.assign(new MedicalRecordOrmEntity(), {
        id: 'record-id',
        animalId: 'animal-id',
        recordType: MedicalRecordType.CONSULTATION,
        title: 'Checkup',
        occurredAt: new Date('2026-03-10T10:00:00.000Z'),
        veterinarianId: 'vet-id',
        diagnosis: 'Healthy',
        treatment: null,
        notes: null,
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        updatedAt: new Date('2026-03-10T10:00:00.000Z'),
        deletedAt: new Date('2026-04-01T00:00:00.000Z'),
      });
      transactionManager.findOne.mockResolvedValue(deletedEntity);

      const result = await medicalRecordRepository.restore('record-id', 'actor-id');

      expect(transactionManager.findOne).toHaveBeenCalledWith(MedicalRecordOrmEntity, {
        where: { id: 'record-id' },
        withDeleted: true,
      });
      expect(deletedEntity.deletedAt).toBeNull();
      expect(transactionManager.save).toHaveBeenNthCalledWith(1, MedicalRecordOrmEntity, deletedEntity);
      expect(transactionManager.create).toHaveBeenCalledWith(
        MedicalRecordChangeOrmEntity,
        expect.objectContaining({
          medicalRecordId: 'record-id',
          changedByUserId: 'actor-id',
          changeType: MedicalRecordChangeType.RESTORE,
        }),
      );
      expect(result).toBeDefined();
    });

    it('returns null when the record does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(medicalRecordRepository.restore('missing-id', 'actor-id')).resolves.toBeNull();
    });
  });
});
