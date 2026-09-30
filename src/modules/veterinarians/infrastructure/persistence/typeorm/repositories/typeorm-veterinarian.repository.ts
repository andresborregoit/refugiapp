import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, QueryFailedError, Repository } from 'typeorm';
import { ResourceConflictException } from '../../../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../../../common/exceptions/resource-not-found.exception';
import { UserRole } from '../../../../../../common/enums/user-role.enum';
import { User } from '../../../../../users/domain/entities/user.entity';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { CreateVeterinarian } from '../../../../domain/entities/create-veterinarian.entity';
import { UpdateVeterinarian } from '../../../../domain/entities/update-veterinarian.entity';
import { Veterinarian } from '../../../../domain/entities/veterinarian.entity';
import {
  CreateVeterinarianWithUserInput,
  PaginatedVeterinarians,
  VeterinarianListQuery,
  VeterinarianRepository,
  VeterinarianWithUser,
} from '../../../../domain/repositories/veterinarian.repository';
import { VeterinarianOrmEntity } from '../entities/veterinarian.orm-entity';

const USER_RELATION = { user: true } as const;

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

  async createWithUser(input: CreateVeterinarianWithUserInput): Promise<VeterinarianWithUser> {
    try {
      const result = await this.repository.manager.transaction(async (manager) => {
        const userRepository = manager.getRepository(UserOrmEntity);
        const veterinarianRepository = manager.getRepository(VeterinarianOrmEntity);

        let resolvedUserId: string | null = null;
        let resolvedUser: UserOrmEntity | null = null;

        if (input.createUser) {
          const createdUser = await userRepository.save(
            userRepository.create({
              email: input.createUser.email,
              passwordHash: input.createUser.passwordHash,
              firstName: input.createUser.firstName,
              lastName: input.createUser.lastName,
              roles: [UserRole.VETERINARIAN],
              isActive: true,
            }),
          );
          resolvedUserId = createdUser.id;
          resolvedUser = createdUser;
        } else if (input.linkUserId) {
          const linkedUser = await userRepository.findOne({ where: { id: input.linkUserId } });

          if (!linkedUser) {
            throw new ResourceNotFoundException('User', input.linkUserId);
          }

          if (input.ensureRole && !linkedUser.roles.includes(input.ensureRole)) {
            linkedUser.roles = [...linkedUser.roles, input.ensureRole];
            await userRepository.save(linkedUser);
          }

          resolvedUserId = linkedUser.id;
          resolvedUser = linkedUser;
        }

        const entity = veterinarianRepository.create({
          firstName: input.veterinarian.firstName,
          lastName: input.veterinarian.lastName,
          licenseNumber: input.veterinarian.licenseNumber,
          userId: resolvedUserId,
          email: input.veterinarian.email,
          phone: input.veterinarian.phone,
          notes: input.veterinarian.notes,
          isActive: true,
        });

        const saved = await veterinarianRepository.save(entity);
        saved.user = resolvedUser;

        return {
          veterinarian: this.toDomain(saved),
          user: resolvedUser ? this.toUserDomain(resolvedUser) : null,
        };
      });

      return result;
    } catch (error) {
      throw mapUniqueConstraintError(error);
    }
  }

  async findById(id: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: USER_RELATION });

    return entity ? this.toDomain(entity) : null;
  }

  async findByLicenseNumber(licenseNumber: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({
      where: { licenseNumber },
      relations: USER_RELATION,
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { userId }, relations: USER_RELATION });

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
      relations: USER_RELATION,
    });

    return {
      items: entities.map((entity) => this.toDomain(entity)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  async update(id: string, input: UpdateVeterinarian): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: USER_RELATION });

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
      await this.repository.save(entity);
      const saved = await this.repository.findOne({ where: { id }, relations: USER_RELATION });

      return saved ? this.toDomain(saved) : null;
    } catch (error) {
      throw mapUniqueConstraintError(error);
    }
  }

  async deactivate(id: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id }, relations: USER_RELATION });

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
      entity.user ? this.toUserDomain(entity.user) : null,
    );
  }

  private toUserDomain(entity: UserOrmEntity): User {
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

    if (constraint === 'IDX_97672ac88f789774dd47f7c8be') {
      throw new ResourceConflictException(
        'Email is already registered.',
        'EMAIL_ALREADY_EXISTS',
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