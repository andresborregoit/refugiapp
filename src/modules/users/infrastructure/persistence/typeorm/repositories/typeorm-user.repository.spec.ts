import { Repository } from 'typeorm';
import { UserOrmEntity } from '../entities/user.orm-entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';

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
    });
    const findOne = jest.fn().mockResolvedValue(stored);
    const save = jest.fn().mockImplementation(async (entity: UserOrmEntity) => entity);
    const repository = new TypeOrmUserRepository({ findOne, save } as unknown as Repository<UserOrmEntity>);

    const result = await repository.update('user-id', { firstName: 'Updated' });

    expect(findOne).toHaveBeenCalledWith({ where: { id: 'user-id' }, withDeleted: true });
    expect(save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'user-id', firstName: 'Updated', lastName: 'User' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns null when updating a soft-deleted user', async () => {
    const stored = Object.assign(new UserOrmEntity(), {
      id: 'user-id',
      deletedAt: new Date(),
    });
    const save = jest.fn();
    const repository = new TypeOrmUserRepository(
      { findOne: jest.fn().mockResolvedValue(stored), save } as unknown as Repository<UserOrmEntity>,
    );

    await expect(repository.update('user-id', { firstName: 'Nope' })).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
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
