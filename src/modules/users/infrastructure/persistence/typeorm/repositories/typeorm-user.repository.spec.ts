import { EntityManager, Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../../media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';

interface TransactionManagerMock {
  findOne: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

function buildManager(overrides: Partial<TransactionManagerMock> = {}) {
  const manager: TransactionManagerMock = {
    findOne: jest.fn(),
    save: jest.fn(async (entity: UserOrmEntity) => entity),
    update: jest.fn(),
    ...overrides,
  };

  const repositoryMock = {
    manager: {
      transaction: jest.fn(async (callback: (m: EntityManager) => unknown) =>
        callback(manager as unknown as EntityManager),
      ),
    },
  } as unknown as Repository<UserOrmEntity>;

  const repository = new TypeOrmUserRepository(repositoryMock);

  return { manager, repository };
}

describe('TypeOrmUserRepository', () => {
  it('lists active and soft-deleted users with deterministic pagination', async () => {
    const findAndCount = jest.fn().mockResolvedValue([
      [
        Object.assign(new UserOrmEntity(), {
          id: 'user-id',
          email: 'user@test.com',
          firstName: 'Test',
          lastName: 'User',
          roles: [],
          isActive: false,
          passwordHash: 'must-not-leak',
        }),
      ],
      3,
    ]);
    const repository = new TypeOrmUserRepository({ findAndCount } as unknown as Repository<UserOrmEntity>);

    const result = await repository.findMany({ page: 2, limit: 10 });

    expect(findAndCount).toHaveBeenCalledWith({
      withDeleted: true,
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: 10,
      take: 10,
    });
    expect(result).toMatchObject({ page: 2, limit: 10, total: 3 });
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.items[0]).toMatchObject({ id: 'user-id', isActive: false });
  });

  it('updates only the provided fields without nulling the rest', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      isActive: true,
      passwordHash: 'must-not-leak',
      deletedAt: null,
      profilePhotoMediaId: null,
    });
    const { manager, repository } = buildManager({
      findOne: jest.fn().mockResolvedValue(stored),
    });

    const result = await repository.update('user-id', { firstName: 'Updated' });

    expect(manager.findOne).toHaveBeenCalledWith(UserOrmEntity, {
      where: { id: 'user-id' },
      withDeleted: true,
    });
    expect(manager.save).toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'user-id', firstName: 'Updated', lastName: 'User' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns null when updating a soft-deleted user', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      deletedAt: new Date(),
    });
    const { manager, repository } = buildManager({
      findOne: jest.fn().mockResolvedValue(stored),
    });

    await expect(repository.update('user-id', { firstName: 'Nope' })).resolves.toBeNull();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('links a new profile photo to the user inside the transaction', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      isActive: true,
      deletedAt: null,
      profilePhotoMediaId: null,
    });
    const { manager, repository } = buildManager({
      findOne: jest.fn().mockResolvedValue(stored),
    });

    await repository.update('user-id', { profilePhotoMediaId: 'media-new' });

    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ profilePhotoMediaId: 'media-new' }),
    );
    expect(manager.update).toHaveBeenCalledWith(
      MediaAssetOrmEntity,
      { id: 'media-new' },
      { ownerType: MediaOwnerType.USER, ownerId: 'user-id' },
    );
  });

  it('orphans the previous photo and links the new one on replacement', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      isActive: true,
      deletedAt: null,
      profilePhotoMediaId: 'media-old',
    });
    const { manager, repository } = buildManager({
      findOne: jest.fn().mockResolvedValue(stored),
    });

    await repository.update('user-id', { profilePhotoMediaId: 'media-new' });

    expect(manager.update).toHaveBeenCalledWith(
      MediaAssetOrmEntity,
      { id: 'media-old' },
      { ownerType: null, ownerId: null },
    );
    expect(manager.update).toHaveBeenCalledWith(
      MediaAssetOrmEntity,
      { id: 'media-new' },
      { ownerType: MediaOwnerType.USER, ownerId: 'user-id' },
    );
  });

  it('orphans the previous photo when clearing it with null', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      email: 'user@test.com',
      firstName: 'Test',
      lastName: 'User',
      roles: [],
      isActive: true,
      deletedAt: null,
      profilePhotoMediaId: 'media-old',
    });
    const { manager, repository } = buildManager({
      findOne: jest.fn().mockResolvedValue(stored),
    });

    await repository.update('user-id', { profilePhotoMediaId: null });

    expect(manager.update).toHaveBeenCalledWith(
      MediaAssetOrmEntity,
      { id: 'media-old' },
      { ownerType: null, ownerId: null },
    );
  });

  it('counts active admins excluding the given id', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const getCount = jest.fn().mockResolvedValue(1);
    const createQueryBuilder = jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere,
      getCount,
    });
    const repository = new TypeOrmUserRepository({
      createQueryBuilder,
    } as unknown as Repository<UserOrmEntity>);

    await expect(repository.countActiveAdmins('excluded-id')).resolves.toBe(1);

    expect(createQueryBuilder).toHaveBeenCalledWith('user');
    expect(andWhere).toHaveBeenCalledWith('user.id != :excludeId', { excludeId: 'excluded-id' });
  });
});
