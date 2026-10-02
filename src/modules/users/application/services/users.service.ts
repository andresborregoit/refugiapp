import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { CreateUserCredentials } from '../../domain/entities/create-user-credentials.entity';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UpdateUserData, UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';
import { ListUsersQueryDto } from '../../interfaces/dto/list-users.query.dto';
import { UpdateUserDto } from '../../interfaces/dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findById(id: string) {
    return this.userRepository.findById(id);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }

    return user;
  }

  listUsers(query: ListUsersQueryDto) {
    return this.userRepository.findMany(query);
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findCredentialsByEmail(email: string) {
    return this.userRepository.findCredentialsByEmail(email);
  }

  findCredentialsById(id: string) {
    return this.userRepository.findCredentialsById(id);
  }

  updatePassword(id: string, passwordHash: string) {
    return this.userRepository.updatePassword(id, passwordHash);
  }

  async createUser(dto: CreateUserDto, actorId: string): Promise<User> {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.userRepository.findByEmail(email);

    if (existing) {
      throw new ResourceConflictException('Email is already registered.', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await hashPassword(dto.password);

    const roles = dto.roles?.length ? dto.roles : [UserRole.SHELTER_MANAGER];

    const input = new CreateUserCredentials(email, dto.firstName, dto.lastName, passwordHash, roles);

    const created = await this.userRepository.create(input);

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.USER_CREATE,
      resourceType: AuditResourceType.USER,
      resourceId: created.id,
      metadata: {
        email: created.email,
        roles: created.roles,
      },
    });

    if (dto.roles?.length) {
      await this.auditLogsService.record({
        actorUserId: actorId,
        action: AuditAction.USER_ROLE_ASSIGN,
        resourceType: AuditResourceType.USER,
        resourceId: created.id,
        metadata: {
          email: created.email,
          roles: created.roles,
        },
      });
    }

    return created;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    const input: UpdateUserData = {};

    if (dto.firstName !== undefined) {
      const firstName = dto.firstName.trim();

      if (!firstName) {
        throw new BadRequestException({
          code: 'INVALID_PAYLOAD',
          message: 'firstName must not be empty.',
        });
      }

      input.firstName = firstName;
    }

    if (dto.lastName !== undefined) {
      const lastName = dto.lastName.trim();

      if (!lastName) {
        throw new BadRequestException({
          code: 'INVALID_PAYLOAD',
          message: 'lastName must not be empty.',
        });
      }

      input.lastName = lastName;
    }

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();

      if (email !== user.email) {
        const existing = await this.userRepository.findByEmail(email);

        if (existing && existing.id !== id) {
          throw new ResourceConflictException(
            'Email is already registered.',
            'EMAIL_ALREADY_EXISTS',
          );
        }

        input.email = email;
      }
    }

    let rolesChanged = false;

    if (dto.roles !== undefined) {
      const roles = [...new Set(dto.roles)];

      if (!roles.length) {
        throw new BadRequestException({
          code: 'INVALID_PAYLOAD',
          message: 'roles must contain at least one role.',
        });
      }

      rolesChanged = !sameRoles(user.roles, roles);

      if (rolesChanged) {
        await this.assertAdminDowngradeAllowed(user, roles, actorId);
        input.roles = roles;
      }
    }

    if (Object.keys(input).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_UPDATE_PAYLOAD',
        message: 'Provide at least one field to update: firstName, lastName, email or roles.',
      });
    }

    const updated = await this.userRepository.update(id, input);

    if (!updated) {
      throw new ResourceNotFoundException('User', id);
    }

    if (rolesChanged) {
      await this.auditLogsService.record({
        actorUserId: actorId,
        action: AuditAction.USER_ROLE_ASSIGN,
        resourceType: AuditResourceType.USER,
        resourceId: id,
        metadata: {
          email: updated.email,
          previousRoles: user.roles,
          roles: updated.roles,
        },
      });
    }

    return updated;
  }

  private async assertAdminDowngradeAllowed(
    user: User,
    nextRoles: UserRole[],
    actorId: string,
  ): Promise<void> {
    const hadAdmin = user.roles.includes(UserRole.ADMIN);
    const keepsAdmin = nextRoles.includes(UserRole.ADMIN);

    if (!hadAdmin || keepsAdmin) {
      return;
    }

    if (user.id === actorId) {
      throw new ResourceConflictException(
        'An admin cannot remove their own admin role.',
        'LAST_ADMIN_FORBIDDEN',
      );
    }

    const remainingAdmins = await this.userRepository.countActiveAdmins(user.id);

    if (remainingAdmins === 0) {
      throw new ResourceConflictException(
        'Cannot remove the admin role from the last active admin.',
        'LAST_ADMIN_FORBIDDEN',
      );
    }
  }

  async deactivateUser(id: string, actorId: string): Promise<void> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    await this.userRepository.softDelete(id);

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.USER_DEACTIVATE,
      resourceType: AuditResourceType.USER,
      resourceId: id,
      metadata: {
        email: user.email,
        previousIsActive: user.isActive,
      },
    });
  }

  async activateUser(id: string, actorId: string): Promise<User> {
    const user = await this.userRepository.activate(id);

    if (!user) {
      throw new ResourceNotFoundException('User', id);
    }

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.USER_ACTIVATE,
      resourceType: AuditResourceType.USER,
      resourceId: id,
      metadata: {
        email: user.email,
      },
    });

    return user;
  }
}

function sameRoles(current: UserRole[], next: UserRole[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  const currentSet = new Set(current);

  return next.every((role) => currentSet.has(role));
}
