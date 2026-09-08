import { Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { CreateUserCredentials } from '../../domain/entities/create-user-credentials.entity';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findCredentialsByEmail(email: string) {
    return this.userRepository.findCredentialsByEmail(email);
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new ResourceConflictException('Email is already registered.', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(dto.password);

    const roles = dto.roles?.length ? dto.roles : [UserRole.SHELTER_MANAGER];

    const input = new CreateUserCredentials(email, dto.firstName, dto.lastName, passwordHash, roles);

    return this.userRepository.create(input);
  }

  async deactivateUser(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    await this.userRepository.softDelete(id);
  }

  async activateUser(id: string): Promise<User> {
    const user = await this.userRepository.activate(id);

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    return user;
  }
}
