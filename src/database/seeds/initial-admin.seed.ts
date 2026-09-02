import 'dotenv/config';
import { hashPassword } from '../../common/security/password-hasher';
import { UserRole } from '../../common/enums/user-role.enum';
import typeormDataSource from '../../config/typeorm.datasource';
import { UserOrmEntity } from '../../modules/users/infrastructure/persistence/typeorm/entities/user.orm-entity';

interface UserSeedRepository {
  create(input: Partial<UserOrmEntity>): UserOrmEntity;
  findOne(options: { where: { email: string } }): Promise<UserOrmEntity | null>;
  save(user: UserOrmEntity): Promise<UserOrmEntity>;
}

export interface InitialAdminSeedConfig {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nodeEnv: string;
  allowProduction: boolean;
  resetPassword: boolean;
}

export interface InitialAdminSeedResult {
  email: string;
  status: 'created' | 'skipped' | 'password_reset';
}

export class InitialAdminSeedConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InitialAdminSeedConfigError';
  }
}

export function readInitialAdminSeedConfig(
  env: NodeJS.ProcessEnv,
): InitialAdminSeedConfig {
  const email = readRequiredEnv(env, 'INITIAL_ADMIN_EMAIL').toLowerCase();
  const password = readRequiredEnv(env, 'INITIAL_ADMIN_PASSWORD');
  const firstName = readRequiredEnv(env, 'INITIAL_ADMIN_FIRST_NAME');
  const lastName = readRequiredEnv(env, 'INITIAL_ADMIN_LAST_NAME');

  if (!email.includes('@')) {
    throw new InitialAdminSeedConfigError('INITIAL_ADMIN_EMAIL must be a valid email.');
  }

  if (password.length < 12) {
    throw new InitialAdminSeedConfigError(
      'INITIAL_ADMIN_PASSWORD must contain at least 12 characters.',
    );
  }

  return {
    email,
    password,
    firstName,
    lastName,
    nodeEnv: env.NODE_ENV ?? 'development',
    allowProduction: env.INITIAL_ADMIN_SEED_ALLOW_PRODUCTION === 'true',
    resetPassword: env.INITIAL_ADMIN_RESET_PASSWORD === 'true',
  };
}

export async function runInitialAdminSeed(
  repository: UserSeedRepository,
  config: InitialAdminSeedConfig,
): Promise<InitialAdminSeedResult> {
  ensureSeedIsAllowed(config);

  const existingUser = await repository.findOne({ where: { email: config.email } });

  if (existingUser) {
    existingUser.firstName = config.firstName;
    existingUser.lastName = config.lastName;
    existingUser.isActive = true;
    existingUser.roles = Array.from(new Set([...existingUser.roles, UserRole.ADMIN]));

    if (config.resetPassword) {
      existingUser.passwordHash = await hashPassword(config.password);
      await repository.save(existingUser);

      return { email: config.email, status: 'password_reset' };
    }

    await repository.save(existingUser);

    return { email: config.email, status: 'skipped' };
  }

  const admin = repository.create({
    email: config.email,
    passwordHash: await hashPassword(config.password),
    firstName: config.firstName,
    lastName: config.lastName,
    roles: [UserRole.ADMIN],
    isActive: true,
  });

  await repository.save(admin);

  return { email: config.email, status: 'created' };
}

function ensureSeedIsAllowed(config: InitialAdminSeedConfig): void {
  if (config.nodeEnv === 'production' && !config.allowProduction) {
    throw new InitialAdminSeedConfigError(
      'Initial admin seed is blocked in production unless INITIAL_ADMIN_SEED_ALLOW_PRODUCTION=true.',
    );
  }
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new InitialAdminSeedConfigError(`${key} is required.`);
  }

  return value;
}

async function main(): Promise<void> {
  const config = readInitialAdminSeedConfig(process.env);

  await typeormDataSource.initialize();

  try {
    const result = await runInitialAdminSeed(
      typeormDataSource.getRepository(UserOrmEntity),
      config,
    );

    console.info(`Initial admin seed ${result.status} for ${result.email}.`);
  } finally {
    await typeormDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown seed error.';

    console.error(message);
    process.exitCode = 1;
  });
}
