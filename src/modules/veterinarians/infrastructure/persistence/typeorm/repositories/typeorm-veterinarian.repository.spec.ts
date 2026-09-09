import { Repository } from 'typeorm';
import { CreateVeterinarian } from '../../../../domain/entities/create-veterinarian.entity';
import { UpdateVeterinarian } from '../../../../domain/entities/update-veterinarian.entity';
import { VeterinarianOrmEntity } from '../entities/veterinarian.orm-entity';
import { TypeOrmVeterinarianRepository } from './typeorm-veterinarian.repository';

describe('TypeOrmVeterinarianRepository', () => {
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findAndCount: jest.Mock;
  };
  let veterinarianRepository: TypeOrmVeterinarianRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = {
      create: jest.fn((data: object) => Object.assign(new VeterinarianOrmEntity(), data)),
      save: jest.fn(async (entity: VeterinarianOrmEntity) =>
        Object.assign(entity, {
          id: entity.id ?? 'veterinarian-id',
          createdAt: entity.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: entity.updatedAt ?? new Date('2026-01-01T00:00:00.000Z'),
        }),
      ),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    veterinarianRepository = new TypeOrmVeterinarianRepository(
      repository as unknown as Repository<VeterinarianOrmEntity>,
    );
  });

  it('creates a veterinarian profile', async () => {
    const result = await veterinarianRepository.create(
      new CreateVeterinarian(
        'Sofia',
        'Martinez',
        'VET-001',
        'user-id',
        'sofia@refugiapp.local',
        '+5491100000000',
        'Clinical lead',
      ),
    );

    expect(repository.create).toHaveBeenCalledWith({
      firstName: 'Sofia',
      lastName: 'Martinez',
      licenseNumber: 'VET-001',
      userId: 'user-id',
      email: 'sofia@refugiapp.local',
      phone: '+5491100000000',
      notes: 'Clinical lead',
      isActive: true,
    });
    expect(repository.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'veterinarian-id',
      userId: 'user-id',
      firstName: 'Sofia',
      licenseNumber: 'VET-001',
      email: 'sofia@refugiapp.local',
      isActive: true,
    });
  });

  it('maps a veterinarian by id', async () => {
    repository.findOne.mockResolvedValue(createEntity());

    await expect(veterinarianRepository.findById('veterinarian-id')).resolves.toMatchObject({
      id: 'veterinarian-id',
      userId: 'user-id',
      firstName: 'Sofia',
      lastName: 'Martinez',
      licenseNumber: 'VET-001',
      email: 'sofia@refugiapp.local',
      phone: '+5491100000000',
      notes: 'Clinical lead',
      isActive: true,
    });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'veterinarian-id' } });
  });

  it('finds veterinarians by licenseNumber and userId', async () => {
    repository.findOne.mockResolvedValue(createEntity());

    await veterinarianRepository.findByLicenseNumber('VET-001');
    await veterinarianRepository.findByUserId('user-id');

    expect(repository.findOne).toHaveBeenNthCalledWith(1, {
      where: { licenseNumber: 'VET-001' },
    });
    expect(repository.findOne).toHaveBeenNthCalledWith(2, { where: { userId: 'user-id' } });
  });

  it('applies pagination, filters, active default and stable ordering', async () => {
    repository.findAndCount.mockResolvedValue([[createEntity()], 12]);

    const result = await veterinarianRepository.findMany({
      page: 2,
      limit: 5,
      name: 'Sof',
      licenseNumber: 'VET',
      isActive: true,
    });

    const options = repository.findAndCount.mock.calls[0]![0]!;

    expect(Array.isArray(options.where)).toBe(true);
    expect(options.where).toHaveLength(2);
    expect(options.where[0]).toEqual(
      expect.objectContaining({
        isActive: true,
        licenseNumber: expect.anything(),
        firstName: expect.anything(),
      }),
    );
    expect(options.where[1]).toEqual(
      expect.objectContaining({
        isActive: true,
        licenseNumber: expect.anything(),
        lastName: expect.anything(),
      }),
    );
    expect(options.skip).toBe(5);
    expect(options.take).toBe(5);
    expect(options.order).toEqual({ lastName: 'ASC', firstName: 'ASC', id: 'ASC' });
    expect(result).toMatchObject({ page: 2, limit: 5, total: 12 });
  });

  it('updates only informed fields', async () => {
    const entity = createEntity();
    repository.findOne.mockResolvedValue(entity);

    await veterinarianRepository.update(
      'veterinarian-id',
      new UpdateVeterinarian(undefined, 'Gomez', undefined, null, null),
    );

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Sofia',
        lastName: 'Gomez',
        licenseNumber: 'VET-001',
        userId: null,
        email: null,
      }),
    );
  });

  it('deactivates with isActive=false without soft delete', async () => {
    const entity = createEntity();
    repository.findOne.mockResolvedValue(entity);

    await veterinarianRepository.deactivate('veterinarian-id');

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    expect(repository).not.toHaveProperty('softDelete');
  });

  function createEntity(): VeterinarianOrmEntity {
    return Object.assign(new VeterinarianOrmEntity(), {
      id: 'veterinarian-id',
      userId: 'user-id',
      firstName: 'Sofia',
      lastName: 'Martinez',
      licenseNumber: 'VET-001',
      email: 'sofia@refugiapp.local',
      phone: '+5491100000000',
      notes: 'Clinical lead',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  }
});
