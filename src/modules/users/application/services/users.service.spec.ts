import { UserRole } from '../../../../common/enums/user-role.enum';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { User } from '../../domain/entities/user.entity';
import { CreateUserRepositoryInput } from '../../domain/repositories/create-user.repository-input';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UsersService } from './users.service';

class InMemoryUserRepository implements UserRepository {
  public users: User[] = [];
  public createdInputs: CreateUserRepositoryInput[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async create(input: CreateUserRepositoryInput): Promise<User> {
    this.createdInputs.push(input);
    const user = new User(
      '40f443d4-3f84-4ce0-ac39-90558f54fd9e',
      input.email,
      input.firstName,
      input.lastName,
      input.roles,
      input.isActive,
    );

    this.users.push(user);

    return user;
  }

  async activate(_id: string): Promise<void> {}

  async softDelete(_id: string): Promise<void> {}
}

describe('UsersService', () => {
  it('normalizes email, hashes password and uses shelter manager by default', async () => {
    const repository = new InMemoryUserRepository();
    const service = new UsersService(repository);

    const user = await service.create({
      email: '  MANAGER@Refugiapp.Local ',
      password: 'plain-password',
      firstName: 'Shelter',
      lastName: 'Manager',
    });

    expect(user).toEqual(
      expect.objectContaining({
        email: 'manager@refugiapp.local',
        roles: [UserRole.SHELTER_MANAGER],
        isActive: true,
      }),
    );
    expect(user).not.toHaveProperty('passwordHash');
    expect(repository.createdInputs[0].passwordHash).not.toBe('plain-password');
    expect(repository.createdInputs[0].passwordHash).toMatch(/^scrypt\$/);
  });

  it('preserves explicit valid roles', async () => {
    const repository = new InMemoryUserRepository();
    const service = new UsersService(repository);

    await service.create({
      email: 'vet@refugiapp.local',
      password: 'plain-password',
      firstName: 'Vet',
      lastName: 'User',
      roles: [UserRole.VETERINARIAN],
    });

    expect(repository.createdInputs[0].roles).toEqual([UserRole.VETERINARIAN]);
  });

  it('throws conflict when email already exists', async () => {
    const repository = new InMemoryUserRepository();
    repository.users.push(
      new User(
        '7ba0f3e3-c8e4-4215-9acf-adf6292980e4',
        'admin@refugiapp.local',
        'Initial',
        'Admin',
        [UserRole.ADMIN],
        true,
      ),
    );
    const service = new UsersService(repository);

    await expect(
      service.create({
        email: ' ADMIN@refugiapp.local ',
        password: 'plain-password',
        firstName: 'Other',
        lastName: 'Admin',
      }),
    ).rejects.toThrow(ResourceConflictException);
  });

  it('maps repository unique violations to conflict errors', async () => {
    const repository = new InMemoryUserRepository();
    repository.create = jest.fn().mockRejectedValue({ code: '23505' });
    const service = new UsersService(repository);

    await expect(
      service.create({
        email: 'new@refugiapp.local',
        password: 'plain-password',
        firstName: 'New',
        lastName: 'User',
      }),
    ).rejects.toThrow(ResourceConflictException);
  });
});
