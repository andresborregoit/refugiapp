import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../../domain/entities/user.entity';
import { CreateUserRepositoryInput } from '../../../../domain/repositories/create-user.repository-input';
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

  async create(input: CreateUserRepositoryInput): Promise<User> {
    const entity = this.repository.create(input);
    const savedEntity = await this.repository.save(entity);

    return this.toDomain(savedEntity);
  }

  async activate(id: string): Promise<void> {
    await this.repository.update(id, {
      isActive: true,
      deletedAt: null,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.softDelete(id);
  }

  private toDomain(entity: UserOrmEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.firstName,
      entity.lastName,
      entity.roles,
      entity.isActive,
    );
  }
}
