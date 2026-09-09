import { Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { UsersService } from '../../../users/application/services/users.service';
import { CreateVeterinarian } from '../../domain/entities/create-veterinarian.entity';
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
  ) {}

  async create(dto: CreateVeterinarianDto): Promise<Veterinarian> {
    const licenseNumber = dto.licenseNumber.trim();
    const existingByLicense = await this.veterinarianRepository.findByLicenseNumber(licenseNumber);

    if (existingByLicense) {
      throw new ResourceConflictException(
        'License number is already registered.',
        'LICENSE_NUMBER_ALREADY_EXISTS',
      );
    }

    const userId = dto.userId ?? null;

    if (userId) {
      await this.ensureUserExists(userId);
      await this.ensureUserIsNotLinked(userId);
    }

    return this.veterinarianRepository.create(
      new CreateVeterinarian(
        dto.firstName.trim(),
        dto.lastName.trim(),
        licenseNumber,
        userId,
        normalizeOptionalText(dto.email)?.toLowerCase() ?? null,
        normalizeOptionalText(dto.phone) ?? null,
        normalizeOptionalText(dto.notes) ?? null,
      ),
    );
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
