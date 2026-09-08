import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserCredentials } from '../../../../domain/entities/create-user-credentials.entity';
import { UserCredentials } from '../../../../domain/entities/user-credentials.entity';
import { User } from '../../../../domain/entities/user.entity';
import { UserRepository } from '../../../../domain/repositories/user.repository';
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

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  async activate(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    entity.isActive = true;
    entity.deletedAt = null;

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
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
