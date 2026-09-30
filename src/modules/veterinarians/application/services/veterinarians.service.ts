import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { hashPassword } from '../../../../common/security/password-hasher';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { UsersService } from '../../../users/application/services/users.service';
import { User } from '../../../users/domain/entities/user.entity';
import { CreateVeterinarian } from '../../domain/entities/create-veterinarian.entity';
import { CreateVeterinarianUser } from '../../domain/entities/create-veterinarian-user.entity';
import { UpdateVeterinarian } from '../../domain/entities/update-veterinarian.entity';
import { Veterinarian } from '../../domain/entities/veterinarian.entity';
import {
  PaginatedVeterinarians,
  VETERINARIAN_REPOSITORY,
  VeterinarianListQuery,
  VeterinarianRepository,
} from '../../domain/repositories/veterinarian.repository';
import { CreateVeterinarianDto } from '../../interfaces/dto/create-veterinarian.dto';
import { UpdateVeterinarianDto } from '../../interfaces/dto/update-veterinarian.dto';

@Injectable()
export class VeterinariansService {
  constructor(
    @Inject(VETERINARIAN_REPOSITORY)
    private readonly veterinarianRepository: VeterinarianRepository,
    private readonly usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateVeterinarianDto, actorId: string): Promise<Veterinarian> {
    const licenseNumber = dto.licenseNumber.trim();
    const existingByLicense = await this.veterinarianRepository.findByLicenseNumber(licenseNumber);

    if (existingByLicense) {
      throw new ResourceConflictException(
        'License number is already registered.',
        'LICENSE_NUMBER_ALREADY_EXISTS',
      );
    }

    if (dto.userId && dto.createUser) {
      throw new BadRequestException({
        code: 'VET_USER_PAYLOAD_CONFLICT',
        message: 'Provide either userId or createUser, not both.',
      });
    }

    const veterinarian = new CreateVeterinarian(
      dto.firstName.trim(),
      dto.lastName.trim(),
      licenseNumber,
      dto.userId ?? null,
      normalizeOptionalText(dto.email)?.toLowerCase() ?? null,
      normalizeOptionalText(dto.phone) ?? null,
      normalizeOptionalText(dto.notes) ?? null,
    );

    if (dto.userId) {
      return this.createWithLinkedUser(dto.userId, veterinarian);
    }

    if (dto.createUser) {
      return this.createWithNewOrReusedUser(dto, veterinarian, actorId);
    }

    return this.veterinarianRepository.create(veterinarian);
  }

  async list(query: VeterinarianListQuery): Promise<PaginatedVeterinarians> {
    return this.veterinarianRepository.findMany(query);
  }

  async findById(id: string): Promise<Veterinarian> {
    const veterinarian = await this.veterinarianRepository.findById(id);

    if (!veterinarian) {
      throw new ResourceNotFoundException('Veterinarian', id);
    }

    return veterinarian;
  }

  async update(id: string, dto: UpdateVeterinarianDto): Promise<Veterinarian> {
    const veterinarian = await this.findById(id);
    const licenseNumber = normalizeOptionalRequiredText(dto.licenseNumber);

    if (licenseNumber) {
      const existingByLicense = await this.veterinarianRepository.findByLicenseNumber(licenseNumber);

      if (existingByLicense && existingByLicense.id !== id) {
        throw new ResourceConflictException(
          'License number is already registered.',
          'LICENSE_NUMBER_ALREADY_EXISTS',
        );
      }
    }

    if (dto.userId !== undefined && dto.userId !== null) {
      await this.ensureUserExists(dto.userId);
      await this.ensureUserIsNotLinked(dto.userId, id);
    }

    const updated = await this.veterinarianRepository.update(
      id,
      new UpdateVeterinarian(
        normalizeOptionalRequiredText(dto.firstName),
        normalizeOptionalRequiredText(dto.lastName),
        licenseNumber,
        dto.userId,
        normalizeOptionalText(dto.email)?.toLowerCase(),
        normalizeOptionalText(dto.phone),
        normalizeOptionalText(dto.notes),
      ),
    );

    if (!updated) {
      throw new ResourceNotFoundException('Veterinarian', veterinarian.id);
    }

    return updated;
  }

  async deactivate(id: string): Promise<void> {
    const veterinarian = await this.veterinarianRepository.deactivate(id);

    if (!veterinarian) {
      throw new ResourceNotFoundException('Veterinarian', id);
    }
  }

  private async createWithLinkedUser(userId: string, veterinarian: CreateVeterinarian): Promise<Veterinarian> {
    await this.ensureUserExists(userId);
    await this.ensureUserIsNotLinked(userId);

    const { veterinarian: created } = await this.veterinarianRepository.createWithUser({
      veterinarian,
      linkUserId: userId,
    });

    return created;
  }

  private async createWithNewOrReusedUser(
    dto: CreateVeterinarianDto,
    veterinarian: CreateVeterinarian,
    actorId: string,
  ): Promise<Veterinarian> {
    const createUser = dto.createUser!;
    const email = (createUser.email ?? dto.email)?.trim().toLowerCase();

    if (!email) {
      throw new BadRequestException({
        code: 'VET_CREATE_USER_EMAIL_REQUIRED',
        message: 'createUser requires an email, either nested or on the veterinarian profile.',
      });
    }

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      await this.ensureUserIsNotLinked(existingUser.id);

      const { veterinarian: created } = await this.veterinarianRepository.createWithUser({
        veterinarian,
        linkUserId: existingUser.id,
        ensureRole: UserRole.VETERINARIAN,
      });

      if (!existingUser.roles.includes(UserRole.VETERINARIAN)) {
        await this.auditLogsService.record({
          actorUserId: actorId,
          action: AuditAction.USER_ROLE_ASSIGN,
          resourceType: AuditResourceType.USER,
          resourceId: existingUser.id,
          metadata: {
            email: existingUser.email,
            roles: [...existingUser.roles, UserRole.VETERINARIAN],
          },
        });
      }

      return created;
    }

    const passwordHash = await hashPassword(createUser.password);

    const { veterinarian: created, user } = await this.veterinarianRepository.createWithUser({
      veterinarian,
      createUser: new CreateVeterinarianUser(
        email,
        passwordHash,
        createUser.firstName?.trim() || veterinarian.firstName,
        createUser.lastName?.trim() || veterinarian.lastName,
      ),
    });

    await this.recordUserCreatedAudit(actorId, user);

    return created;
  }

  private async recordUserCreatedAudit(actorId: string, user: User | null): Promise<void> {
    if (!user) {
      return;
    }

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.USER_CREATE,
      resourceType: AuditResourceType.USER,
      resourceId: user.id,
      metadata: {
        email: user.email,
        roles: user.roles,
      },
    });
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new ResourceNotFoundException('User', userId);
    }
  }

  private async ensureUserIsNotLinked(userId: string, currentVeterinarianId?: string): Promise<void> {
    const linkedVeterinarian = await this.veterinarianRepository.findByUserId(userId);

    if (linkedVeterinarian && linkedVeterinarian.id !== currentVeterinarianId) {
      throw new ResourceConflictException(
        'User is already linked to another veterinarian.',
        'USER_ALREADY_LINKED_TO_VETERINARIAN',
      );
    }
  }
}

function normalizeOptionalRequiredText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.trim() || undefined;
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.trim() || null;
}