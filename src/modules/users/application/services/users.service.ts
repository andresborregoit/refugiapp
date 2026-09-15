import { Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { CreateUserCredentials } from '../../domain/entities/create-user-credentials.entity';
import { User } from '../../domain/entities/user.entity';
import { USER_REPOSITORY, UserRepository } from '../../domain/repositories/user.repository';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';

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

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findCredentialsByEmail(email: string) {
    return this.userRepository.findCredentialsByEmail(email);
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