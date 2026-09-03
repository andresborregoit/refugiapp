import { UserRole } from '../../../../../../common/enums/user-role.enum';
import { TypeOrmUserRepository } from './typeorm-user.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';

describe('TypeOrmUserRepository', () => {
  function createOrmUser(overrides: Partial<UserOrmEntity> = {}): UserOrmEntity {
    return Object.assign(new UserOrmEntity(), {
      id: '1c5afd28-985a-4f74-9c45-f361e7e2a370',
      email: 'manager@refugiapp.local',
      passwordHash: 'scrypt$hash',
      firstName: 'Shelter',
      lastName: 'Manager',
      roles: [UserRole.SHELTER_MANAGER],
      isActive: true,
      ...overrides,
    });
  }

  it('creates a user and maps it without passwordHash', async () => {
    const entity = createOrmUser();
    const repository = {
      create: jest.fn().mockReturnValue(entity),
      save: jest.fn().mockResolvedValue(entity),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    const usersRepository = new TypeOrmUserRepository(repository as any);

    const user = await usersRepository.create({
      email: entity.email,
      passwordHash: entity.passwordHash,
      firstName: entity.firstName,
      lastName: entity.lastName,
      roles: entity.roles,
      isActive: entity.isActive,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: entity.passwordHash }),
    );
    expect(repository.save).toHaveBeenCalledWith(entity);
    expect(user).toEqual(
      expect.objectContaining({
        id: entity.id,
        email: entity.email,
        roles: entity.roles,
      }),
    );
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('prepares activation by restoring active state and deletedAt', async () => {
    const repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn(),
    };
    const usersRepository = new TypeOrmUserRepository(repository as any);

    await usersRepository.activate('1c5afd28-985a-4f74-9c45-f361e7e2a370');

    expect(repository.update).toHaveBeenCalledWith('1c5afd28-985a-4f74-9c45-f361e7e2a370', {
      isActive: true,
      deletedAt: null,
    });
  });

  it('prepares logical deletion through TypeORM soft delete', async () => {
    const repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const usersRepository = new TypeOrmUserRepository(repository as any);

    await usersRepository.softDelete('1c5afd28-985a-4f74-9c45-f361e7e2a370');

    expect(repository.softDelete).toHaveBeenCalledWith('1c5afd28-985a-4f74-9c45-f361e7e2a370');
  });
});
