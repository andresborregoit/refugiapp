import { Repository } from 'typeorm';
import { UserRole } from '../../../../../../common/enums/user-role.enum';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
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
    manager: {
      transaction: jest.Mock;
    };
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
      manager: {
        transaction: jest.fn(),
      },
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

  describe('createWithUser', () => {
    const createVeterinarianInput = () =>
      new CreateVeterinarian(
        'Sofia',
        'Martinez',
        'VET-001',
        null,
        'sofia@refugiapp.local',
        '+5491100000000',
        'Clinical lead',
      );

    it('creates the user and the veterinarian in a single transaction', async () => {
      const userRepository = {
        create: jest.fn((data: object) => Object.assign(new UserOrmEntity(), data)),
        save: jest.fn(async (entity: UserOrmEntity) =>
          Object.assign(entity, {
            id: 'created-user-id',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
        findOne: jest.fn(),
      };
      const veterinarianRepositoryInTx = {
        create: jest.fn((data: object) => Object.assign(new VeterinarianOrmEntity(), data)),
        save: jest.fn(async (entity: VeterinarianOrmEntity) =>
          Object.assign(entity, {
            id: 'veterinarian-id',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          }),
        ),
      };

      repository.manager.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: jest.fn((entity: unknown) =>
            entity === UserOrmEntity ? userRepository : veterinarianRepositoryInTx,
          ),
        }),
      );

      const result = await veterinarianRepository.createWithUser({
        veterinarian: createVeterinarianInput(),
        createUser: {
          email: 'vet@refugiapp.local',
          passwordHash: 'hashed-password',
          firstName: 'Sofia',
          lastName: 'Martinez',
        },
      });

      expect(userRepository.create).toHaveBeenCalledWith({
        email: 'vet@refugiapp.local',
        passwordHash: 'hashed-password',
        firstName: 'Sofia',
        lastName: 'Martinez',
        roles: [UserRole.VETERINARIAN],
        isActive: true,
      });
      expect(veterinarianRepositoryInTx.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'created-user-id',
          isActive: true,
        }),
      );
      expect(result).toMatchObject({
        veterinarian: expect.objectContaining({ id: 'veterinarian-id', userId: 'created-user-id' }),
        user: expect.objectContaining({ id: 'created-user-id', roles: [UserRole.VETERINARIAN] }),
      });
    });

    it('links an existing user and grants the veterinarian role within the transaction', async () => {
      const existingUser = Object.assign(new UserOrmEntity(), {
        id: 'user-id',
        email: 'sofia.user@refugiapp.local',
        firstName: 'Sofia',
        lastName: 'Martinez',
        roles: [UserRole.SHELTER_MANAGER],
        isActive: true,
      });
      const userRepository = {
        create: jest.fn(),
        save: jest.fn(async (entity: UserOrmEntity) => entity),
        findOne: jest.fn(async () => existingUser),
      };
      const veterinarianRepositoryInTx = {
        create: jest.fn((data: object) => Object.assign(new VeterinarianOrmEntity(), data)),
        save: jest.fn(async (entity: VeterinarianOrmEntity) =>
          Object.assign(entity, { id: 'veterinarian-id' }),
        ),
      };

      repository.manager.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: jest.fn((entity: unknown) =>
            entity === UserOrmEntity ? userRepository : veterinarianRepositoryInTx,
          ),
        }),
      );

      const result = await veterinarianRepository.createWithUser({
        veterinarian: createVeterinarianInput(),
        linkUserId: 'user-id',
        ensureRole: UserRole.VETERINARIAN,
      });

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ roles: [UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN] }),
      );
      expect(veterinarianRepositoryInTx.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id' }),
      );
      expect(result.user).toMatchObject({
        id: 'user-id',
        roles: [UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN],
      });
    });

    it('does not change roles when the linked user already has the veterinarian role', async () => {
      const existingUser = Object.assign(new UserOrmEntity(), {
        id: 'user-id',
        email: 'vet@refugiapp.local',
        firstName: 'Sofia',
        lastName: 'Martinez',
        roles: [UserRole.VETERINARIAN],
        isActive: true,
      });
      const userRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(async () => existingUser),
      };
      const veterinarianRepositoryInTx = {
        create: jest.fn((data: object) => Object.assign(new VeterinarianOrmEntity(), data)),
        save: jest.fn(async (entity: VeterinarianOrmEntity) =>
          Object.assign(entity, { id: 'veterinarian-id' }),
        ),
      };

      repository.manager.transaction.mockImplementation(async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: jest.fn((entity: unknown) =>
            entity === UserOrmEntity ? userRepository : veterinarianRepositoryInTx,
          ),
        }),
      );

      await veterinarianRepository.createWithUser({
        veterinarian: createVeterinarianInput(),
        linkUserId: 'user-id',
        ensureRole: UserRole.VETERINARIAN,
      });

      expect(userRepository.save).not.toHaveBeenCalled();
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
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'veterinarian-id' },
      relations: { user: true },
    });
  });

  it('maps the linked user without passwordHash', async () => {
    const entity = createEntity();
    entity.user = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      email: 'sofia.user@refugiapp.local',
      firstName: 'Sofia',
      lastName: 'Martinez',
      roles: [UserRole.VETERINARIAN],
      isActive: true,
    });
    repository.findOne.mockResolvedValue(entity);

    const result = await veterinarianRepository.findById('veterinarian-id');

    expect(result?.user).toMatchObject({
      id: 'user-id',
      email: 'sofia.user@refugiapp.local',
      roles: [UserRole.VETERINARIAN],
    });
    expect(result?.user).not.toHaveProperty('passwordHash');
  });

  it('finds veterinarians by licenseNumber and userId', async () => {
    repository.findOne.mockResolvedValue(createEntity());

    await veterinarianRepository.findByLicenseNumber('VET-001');
    await veterinarianRepository.findByUserId('user-id');

    expect(repository.findOne).toHaveBeenNthCalledWith(1, {
      where: { licenseNumber: 'VET-001' },
      relations: { user: true },
    });
    expect(repository.findOne).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-id' },
      relations: { user: true },
    });
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
    expect(options.relations).toEqual({ user: true });
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

  it('reactivates with isActive=true without soft delete', async () => {
    const entity = createEntity({ isActive: false });
    repository.findOne.mockResolvedValue(entity);

    const result = await veterinarianRepository.reactivate('veterinarian-id');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'veterinarian-id' },
      relations: { user: true },
    });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
    expect(result).toMatchObject({ id: 'veterinarian-id', isActive: true });
    expect(repository).not.toHaveProperty('softDelete');
  });

  it('returns null when reactivating a missing veterinarian', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(veterinarianRepository.reactivate('missing-id')).resolves.toBeNull();
    expect(repository.save).not.toHaveBeenCalled();
  });

  function createEntity(overrides: Partial<VeterinarianOrmEntity> = {}): VeterinarianOrmEntity {
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
      ...overrides,
    });
  }
});