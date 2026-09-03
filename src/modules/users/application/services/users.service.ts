import { Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserInput } from '../dto/create-user.input';

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

  async create(input: CreateUserInput) {
    const email = this.normalizeEmail(input.email);
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ResourceConflictException('Email is already registered.', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(input.password);

    try {
      return await this.userRepository.create({
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        roles: input.roles?.length ? input.roles : [UserRole.SHELTER_MANAGER],
        isActive: true,
      });
    } catch (error) {
      if (this.isUniqueEmailConflict(error)) {
        throw new ResourceConflictException('Email is already registered.', 'EMAIL_ALREADY_EXISTS');
      }

      throw error;
    }
  }

  async activate(id: string): Promise<void> {
    await this.userRepository.activate(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepository.softDelete(id);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueEmailConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
