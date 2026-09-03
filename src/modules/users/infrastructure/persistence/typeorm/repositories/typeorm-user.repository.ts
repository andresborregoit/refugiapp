import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
