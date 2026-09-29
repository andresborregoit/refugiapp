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
});
