import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, QueryFailedError, Repository } from 'typeorm';
import { buildStatusChangeEventDescription } from '../../../../../animals/domain/entities/animal-history-event.entity';
import { AnimalHistoryEventType } from '../../../../../animals/domain/enums/animal-history-event-type.enum';
import { AnimalStatus } from '../../../../../animals/domain/enums/animal-status.enum';
import { AnimalHistoryEventOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { Adopter } from '../../../../domain/entities/adopter.entity';
import { Adoption } from '../../../../domain/entities/adoption.entity';
import { AdoptionApplication } from '../../../../domain/entities/adoption-application.entity';
import { AdoptionApplicationStatus } from '../../../../domain/enums/adoption-application-status.enum';
import {
  AdoptionRepository,
  CompleteAdoptionResult,
  CreateAdopter,
  CreateAdoptionApplication,
  ListPageQuery,
  PaginatedAdoptionApplications,
  PaginatedAdoptions,
} from '../../../../domain/repositories/adoption.repository';
import { AdopterOrmEntity } from '../entities/adopter.orm-entity';
import { AdoptionApplicationOrmEntity } from '../entities/adoption-application.orm-entity';
import { AdoptionOrmEntity } from '../entities/adoption.orm-entity';

@Injectable()
export class TypeOrmAdoptionRepository implements AdoptionRepository {
  constructor(
    @InjectRepository(AdopterOrmEntity)
    private readonly adopterRepository: Repository<AdopterOrmEntity>,
    @InjectRepository(AdoptionApplicationOrmEntity)
    private readonly applicationRepository: Repository<AdoptionApplicationOrmEntity>,
    @InjectRepository(AdoptionOrmEntity)
    private readonly adoptionRepository: Repository<AdoptionOrmEntity>,
  ) {}

  async createAdopter(input: CreateAdopter): Promise<Adopter | null> {
    try {
      const saved = await this.adopterRepository.save(this.adopterRepository.create(input));
      return this.toAdopter(saved);
    } catch (error) {
      if (this.isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async findAdopterById(id: string): Promise<Adopter | null> {
    const entity = await this.adopterRepository.findOne({ where: { id } });
    return entity ? this.toAdopter(entity) : null;
  }

  async findAdopterByEmail(email: string): Promise<Adopter | null> {
    const entity = await this.adopterRepository.findOne({ where: { email } });
    return entity ? this.toAdopter(entity) : null;
  }

  async createApplication(
    input: CreateAdoptionApplication,
  ): Promise<AdoptionApplication | null> {
    try {
      const saved = await this.applicationRepository.save(
        this.applicationRepository.create({
          ...input,
          status: AdoptionApplicationStatus.PENDING,
          decidedAt: null,
          decidedByUserId: null,
        }),
      );
      return this.toApplication(saved);
    } catch (error) {
      if (this.isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async findApplicationById(id: string): Promise<AdoptionApplication | null> {
    const entity = await this.applicationRepository.findOne({ where: { id } });
    return entity ? this.toApplication(entity) : null;
  }

  async listApplicationsByAnimal(
    animalId: string,
    query: ListPageQuery,
  ): Promise<PaginatedAdoptionApplications> {
    const [entities, total] = await this.applicationRepository.findAndCount({
      where: { animalId },
      order: { submittedAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: entities.map((entity) => this.toApplication(entity)), total, ...query };
  }

  async completeAdoption(
    applicationId: string,
    adoptedAt: Date,
    responsibleUserId: string,
  ): Promise<CompleteAdoptionResult> {
    return this.applicationRepository.manager.transaction(async (manager) => {
      const application = await manager.findOne(AdoptionApplicationOrmEntity, {
        where: { id: applicationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!application) return { status: 'application_not_found' };
      if (application.status !== AdoptionApplicationStatus.PENDING) {
        return { status: 'application_not_pending' };
      }

      const animal = await manager.findOne(AnimalOrmEntity, {
        where: { id: application.animalId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!animal) return { status: 'animal_not_found' };
      if (animal.status !== AnimalStatus.AVAILABLE_FOR_ADOPTION) {
        return { status: 'animal_not_available' };
      }

      const adoptionEntity = await manager.save(
        manager.create(AdoptionOrmEntity, {
          animalId: application.animalId,
          adopterId: application.adopterId,
          applicationId: application.id,
          adoptedAt,
          responsibleUserId,
        }),
      );
      await manager.update(
        AdoptionApplicationOrmEntity,
        { id: application.id },
        {
          status: AdoptionApplicationStatus.APPROVED,
          decidedAt: adoptedAt,
          decidedByUserId: responsibleUserId,
        },
      );
      await manager.update(
        AdoptionApplicationOrmEntity,
        {
          animalId: application.animalId,
          status: AdoptionApplicationStatus.PENDING,
          id: Not(application.id),
        },
        {
          status: AdoptionApplicationStatus.REJECTED,
          decidedAt: adoptedAt,
          decidedByUserId: responsibleUserId,
        },
      );
      await manager.update(AnimalOrmEntity, { id: animal.id }, { status: AnimalStatus.ADOPTED });
      await manager.save(
        manager.create(AnimalHistoryEventOrmEntity, {
          animalId: animal.id,
          eventType: AnimalHistoryEventType.STATUS_CHANGE,
          description: buildStatusChangeEventDescription(
            AnimalStatus.AVAILABLE_FOR_ADOPTION,
            AnimalStatus.ADOPTED,
          ),
          occurredAt: adoptedAt,
          createdByUserId: responsibleUserId,
          metadata: {
            from: AnimalStatus.AVAILABLE_FOR_ADOPTION,
            to: AnimalStatus.ADOPTED,
            adoptionId: adoptionEntity.id,
            applicationId: application.id,
          },
        }),
      );

      return { status: 'completed', adoption: this.toAdoption(adoptionEntity) };
    });
  }

  async listAdoptionsByAnimal(
    animalId: string,
    query: ListPageQuery,
  ): Promise<PaginatedAdoptions> {
    const [entities, total] = await this.adoptionRepository.findAndCount({
      where: { animalId },
      order: { adoptedAt: 'DESC', id: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { items: entities.map((entity) => this.toAdoption(entity)), total, ...query };
  }

  private toAdopter(entity: AdopterOrmEntity): Adopter {
    return new Adopter(
      entity.id,
      entity.firstName,
      entity.lastName,
      entity.email,
      entity.phone,
      entity.address,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toApplication(entity: AdoptionApplicationOrmEntity): AdoptionApplication {
    return new AdoptionApplication(
      entity.id,
      entity.animalId,
      entity.adopterId,
      entity.status,
      entity.submittedAt,
      entity.createdByUserId,
      entity.decidedAt,
      entity.decidedByUserId,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toAdoption(entity: AdoptionOrmEntity): Adoption {
    return new Adoption(
      entity.id,
      entity.animalId,
      entity.adopterId,
      entity.applicationId,
      entity.adoptedAt,
      entity.responsibleUserId,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505';
  }
}
