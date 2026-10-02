import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../../../../../common/enums/user-role.enum';
import { CreateUserCredentials } from '../../../../domain/entities/create-user-credentials.entity';
import { UserCredentials } from '../../../../domain/entities/user-credentials.entity';
import { User } from '../../../../domain/entities/user.entity';
import {
  PaginatedUsers,
  UpdateUserData,
  UserListQuery,
  UserRepository,
} from '../../../../domain/repositories/user.repository';
import { UserOrmEntity } from '../entities/user.orm-entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { email } });

    return entity ? this.toDomain(entity) : null;
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const entity = await this.repository.findOne({ where: { email } });

    return entity ? this.toCredentials(entity) : null;
  }

  async findCredentialsById(id: string): Promise<UserCredentials | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toCredentials(entity) : null;
  }

  async findMany(query: UserListQuery): Promise<PaginatedUsers> {
    const [entities, total] = await this.repository.findAndCount({
      withDeleted: true,
      order: { createdAt: 'DESC', id: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async create(input: CreateUserCredentials): Promise<User> {
    const entity = this.repository.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      roles: input.roles,
      isActive: true,
    });

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async update(id: string, input: UpdateUserData): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!entity || entity.deletedAt) {
      return null;
    }

    if (input.firstName !== undefined) {
      entity.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      entity.lastName = input.lastName;
    }

    if (input.email !== undefined) {
      entity.email = input.email;
    }

    if (input.roles !== undefined) {
      entity.roles = input.roles;
    }

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async countActiveAdmins(excludeId?: string): Promise<number> {
    const query = this.repository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.deletedAt IS NULL')
      .andWhere('CAST(:role AS user_role) = ANY(user.roles)', { role: UserRole.ADMIN });

    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }

    return query.getCount();
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.manager.transaction(async (manager) => {
      await manager.update(UserOrmEntity, { id }, { isActive: false });
      await manager.softDelete(UserOrmEntity, { id });
    });
  }

  async activate(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!entity) {
      return null;
    }

    entity.isActive = true;
    entity.deletedAt = null;

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.repository.update({ id }, { passwordHash });
  }

  private toDomain(entity: UserOrmEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.firstName,
      entity.lastName,
      entity.roles,
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toCredentials(entity: UserOrmEntity): UserCredentials {
    return new UserCredentials(
      entity.id,
      entity.email,
      entity.passwordHash,
      entity.roles,
      entity.isActive,
    );
  }
}
