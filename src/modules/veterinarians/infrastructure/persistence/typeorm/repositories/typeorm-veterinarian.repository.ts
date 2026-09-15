import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, QueryFailedError, Repository } from 'typeorm';
import { ResourceConflictException } from '../../../../../../common/exceptions/resource-conflict.exception';
import { CreateVeterinarian } from '../../../../domain/entities/create-veterinarian.entity';
import { UpdateVeterinarian } from '../../../../domain/entities/update-veterinarian.entity';
import { Veterinarian } from '../../../../domain/entities/veterinarian.entity';
import {
  PaginatedVeterinarians,
  VeterinarianListQuery,
  VeterinarianRepository,
} from '../../../../domain/repositories/veterinarian.repository';
import { VeterinarianOrmEntity } from '../entities/veterinarian.orm-entity';

@Injectable()
export class TypeOrmVeterinarianRepository implements VeterinarianRepository {
  constructor(
    @InjectRepository(VeterinarianOrmEntity)
    private readonly repository: Repository<VeterinarianOrmEntity>,
  ) {}

  async create(input: CreateVeterinarian): Promise<Veterinarian> {
    const entity = this.repository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      licenseNumber: input.licenseNumber,
      userId: input.userId,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      isActive: true,
    });

    try {
      const saved = await this.repository.save(entity);

      return this.toDomain(saved);
    } catch (error) {
      throw mapUniqueConstraintError(error);
    }
  }

  async findById(id: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { licenseNumber } });

    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { userId } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: VeterinarianListQuery): Promise<PaginatedVeterinarians> {
    const baseWhere: FindOptionsWhere<VeterinarianOrmEntity> = {
      isActive: query.isActive ?? true,
    };

    if (query.licenseNumber) {
      baseWhere.licenseNumber = ILike(`%${escapeLikePattern(query.licenseNumber)}%`);
    }

    const where = query.name
      ? [
          { ...baseWhere, firstName: ILike(`%${escapeLikePattern(query.name)}%`) },
          { ...baseWhere, lastName: ILike(`%${escapeLikePattern(query.name)}%`) },
        ]
      : baseWhere;

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { lastName: 'ASC', firstName: 'ASC', id: 'ASC' },
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

  async update(id: string, input: UpdateVeterinarian): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    if (input.firstName !== undefined) {
      entity.firstName = input.firstName;
    }

    if (input.lastName !== undefined) {
      entity.lastName = input.lastName;
    }

    if (input.licenseNumber !== undefined) {
      entity.licenseNumber = input.licenseNumber;
    }

    if (input.userId !== undefined) {
      entity.userId = input.userId;
    }

    if (input.email !== undefined) {
      entity.email = input.email;
    }

    if (input.phone !== undefined) {
      entity.phone = input.phone;
    }

    if (input.notes !== undefined) {
      entity.notes = input.notes;
    }

    try {
      const saved = await this.repository.save(entity);

      return this.toDomain(saved);
    } catch (error) {
      throw mapUniqueConstraintError(error);
    }
  }

  async deactivate(id: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    entity.isActive = false;

    const saved = await this.repository.save(entity);

    return this.toDomain(saved);
  }

  private toDomain(entity: VeterinarianOrmEntity): Veterinarian {
    return new Veterinarian(
      entity.id,
      entity.userId ?? null,
      entity.firstName,
      entity.lastName,
      entity.licenseNumber,
      entity.email ?? null,
      entity.phone ?? null,
      entity.notes ?? null,
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function mapUniqueConstraintError(error: unknown): never {
  if (error instanceof QueryFailedError && isPostgresUniqueViolation(error)) {
    const constraint = error.driverError.constraint;

    if (constraint === 'IDX_1bab8531b381146afb6dfd799d') {
      throw new ResourceConflictException(
        'License number is already registered.',
        'LICENSE_NUMBER_ALREADY_EXISTS',
      );
    }

    if (constraint === 'IDX_b19946c9f80a4a02d031cc3f15') {
      throw new ResourceConflictException(
        'User is already linked to another veterinarian.',
        'USER_ALREADY_LINKED_TO_VETERINARIAN',
      );
    }
  }

  throw error;
}

function isPostgresUniqueViolation(
  error: QueryFailedError,
): error is QueryFailedError & { driverError: { code: string; constraint?: string } } {
  return (
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    error.driverError.code === '23505'
  );
}
