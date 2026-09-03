import { UserRole } from '../../common/enums/user-role.enum';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import {
  InitialAdminSeedConfig,
  InitialAdminSeedConfigError,
  readInitialAdminSeedConfig,
  runInitialAdminSeed,
} from './initial-admin.seed';

class InMemoryUserRepository {
  public readonly users: UserOrmEntity[] = [];

  create(input: Partial<UserOrmEntity>): UserOrmEntity {
    return Object.assign(new UserOrmEntity(), input);
  }

  async findOne(options: { where: { email: string } }): Promise<UserOrmEntity | null> {
    return this.users.find((user) => user.email === options.where.email) ?? null;
  }

  async save(user: UserOrmEntity): Promise<UserOrmEntity> {
    const existingIndex = this.users.findIndex((storedUser) => storedUser.email === user.email);

    if (existingIndex >= 0) {
      this.users[existingIndex] = user;

      return user;
    }

    this.users.push(user);

    return user;
  }
}

describe('initial admin seed', () => {
  const baseConfig: InitialAdminSeedConfig = {
    email: 'admin@refugiapp.local',
    password: 'correct horse battery staple',
    firstName: 'Initial',
    lastName: 'Admin',
    nodeEnv: 'development',
    allowProduction: false,
    resetPassword: false,
  };

  it('creates the initial admin with a hashed password on first execution', async () => {
    const repository = new InMemoryUserRepository();

    const result = await runInitialAdminSeed(repository, baseConfig);

    expect(result).toEqual({ email: baseConfig.email, status: 'created' });
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0].roles).toEqual([UserRole.ADMIN]);
    expect(repository.users[0].passwordHash).not.toBe(baseConfig.password);
    expect(repository.users[0].passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('does not duplicate users on repeated executions', async () => {
    const repository = new InMemoryUserRepository();

    await runInitialAdminSeed(repository, baseConfig);
    const result = await runInitialAdminSeed(repository, baseConfig);

    expect(result).toEqual({ email: baseConfig.email, status: 'skipped' });
    expect(repository.users).toHaveLength(1);
    expect(repository.users[0].roles).toContain(UserRole.ADMIN);
  });

  it('fails when required configuration is missing', () => {
    expect(() => readInitialAdminSeedConfig({ NODE_ENV: 'development' })).toThrow(
      InitialAdminSeedConfigError,
    );
  });

  it('blocks production execution without explicit authorization', async () => {
    const repository = new InMemoryUserRepository();

    await expect(
      runInitialAdminSeed(repository, {
        ...baseConfig,
        nodeEnv: 'production',
        allowProduction: false,
      }),
    ).rejects.toThrow(InitialAdminSeedConfigError);
  });
});
