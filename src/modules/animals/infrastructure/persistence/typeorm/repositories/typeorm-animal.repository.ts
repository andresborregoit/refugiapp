import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { MediaOwnerType } from '../../../../../media/domain/enums/media-owner-type.enum';
import { MediaAssetOrmEntity } from '../../../../../media/infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { Animal } from '../../../../domain/entities/animal.entity';
import {
  buildStatusChangeEventDescription,
  INTAKE_EVENT_DESCRIPTION,
} from '../../../../domain/entities/animal-history-event.entity';
import { ChangeAnimalStatus } from '../../../../domain/entities/change-animal-status.entity';
import { CreateAnimal } from '../../../../domain/entities/create-animal.entity';
import { UpdateAnimal } from '../../../../domain/entities/update-animal.entity';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
import { AnimalSex } from '../../../../domain/enums/animal-sex.enum';
import {
  AnimalListQuery,
  AnimalRepository,
  PaginatedAnimals,
} from '../../../../domain/repositories/animal.repository';
import { AnimalHistoryEventOrmEntity } from '../entities/animal-history-event.orm-entity';
import { AnimalOrmEntity } from '../entities/animal.orm-entity';

@Injectable()
export class TypeOrmAnimalRepository implements AnimalRepository {
  constructor(
    @InjectRepository(AnimalOrmEntity)
    private readonly repository: Repository<AnimalOrmEntity>,
  ) {}

  async create(input: CreateAnimal): Promise<Animal> {
    return this.repository.manager.transaction(async (manager) => {
      const animal = await manager.save(
        manager.create(AnimalOrmEntity, {
          name: input.name,
          species: input.species,
          breed: input.breed,
          sex: input.sex,
          status: input.status,
          birthDate: input.birthDate ? toDateColumnValue(input.birthDate) : null,
          intakeDate: toDateColumnValue(input.intakeDate),
          profilePhotoMediaId: input.profilePhotoMediaId,
          notes: input.notes,
        }),
      );

      if (input.profilePhotoMediaId) {
        await manager.update(
          MediaAssetOrmEntity,
          { id: input.profilePhotoMediaId },
          { ownerType: MediaOwnerType.ANIMAL, ownerId: animal.id },
        );
      }

      await manager.save(
        manager.create(AnimalHistoryEventOrmEntity, {
          animalId: animal.id,
          eventType: AnimalHistoryEventType.INTAKE,
          description: INTAKE_EVENT_DESCRIPTION,
          occurredAt: input.intakeDate,
          createdByUserId: input.createdByUserId,
          metadata: {},
        }),
      );

      return this.toDomain(animal);
    });
  }

  async update(id: string, input: UpdateAnimal): Promise<Animal | null> {
    return this.repository.manager.transaction(async (manager) => {
      const current = await manager.findOne(AnimalOrmEntity, { where: { id } });

      if (!current) {
        return null;
      }

      const changes: {
        name?: string;
        species?: string;
        breed?: string | null;
        sex?: AnimalSex;
        intakeDate?: string;
        birthDate?: string | null;
        profilePhotoMediaId?: string | null;
      } = {};
      if (input.name !== undefined) changes.name = input.name;
      if (input.species !== undefined) changes.species = input.species;
      if (input.breed !== undefined) changes.breed = input.breed;
      if (input.sex !== undefined) changes.sex = input.sex;
      if (input.intakeDate !== undefined) changes.intakeDate = toDateColumnValue(input.intakeDate);
      if (input.birthDate !== undefined) {
        changes.birthDate = input.birthDate ? toDateColumnValue(input.birthDate) : null;
      }
      if (input.profilePhotoMediaId !== undefined) {
        changes.profilePhotoMediaId = input.profilePhotoMediaId;
      }

      if (Object.keys(changes).length > 0) {
        await manager.update(AnimalOrmEntity, id, changes);
      }

      if (
        input.profilePhotoMediaId !== undefined &&
        input.profilePhotoMediaId !== current.profilePhotoMediaId
      ) {
        if (current.profilePhotoMediaId) {
          await manager.update(
            MediaAssetOrmEntity,
            { id: current.profilePhotoMediaId },
            { ownerType: null, ownerId: null },
          );
        }

        if (input.profilePhotoMediaId) {
          await manager.update(
            MediaAssetOrmEntity,
            { id: input.profilePhotoMediaId },
            { ownerType: MediaOwnerType.ANIMAL, ownerId: id },
          );
        }
      }

      const updated = await manager.findOne(AnimalOrmEntity, { where: { id } });
      return updated ? this.toDomain(updated) : null;
    });
  }

  async findById(id: string): Promise<Animal | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async findMany(query: AnimalListQuery): Promise<PaginatedAnimals> {
    const where: FindOptionsWhere<AnimalOrmEntity> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.species) {
      where.species = query.species;
    }

    if (query.sex) {
      where.sex = query.sex;
    }

    if (query.name) {
      where.name = ILike(`%${escapeLikePattern(query.name)}%`);
    }

    const [entities, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'ASC', id: 'ASC' },
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

  async changeStatus(input: ChangeAnimalStatus): Promise<Animal> {
    return this.repository.manager.transaction(async (manager) => {
      await manager.update(AnimalOrmEntity, input.animalId, { status: input.to });

      await manager.save(
        manager.create(AnimalHistoryEventOrmEntity, {
          animalId: input.animalId,
          eventType: AnimalHistoryEventType.STATUS_CHANGE,
          description: buildStatusChangeEventDescription(input.from, input.to),
          occurredAt: input.occurredAt,
          createdByUserId: input.actorId,
          metadata: { from: input.from, to: input.to },
        }),
      );

      const updated = await manager.findOneOrFail(AnimalOrmEntity, {
        where: { id: input.animalId },
      });

      return this.toDomain(updated);
    });
  }

  private toDomain(entity: AnimalOrmEntity): Animal {
    return new Animal(
      entity.id,
      entity.name,
      entity.species,
      entity.breed ?? null,
      entity.sex,
      entity.status,
      new Date(entity.intakeDate),
      entity.birthDate ? new Date(entity.birthDate) : null,
      entity.notes ?? null,
      entity.profilePhotoMediaId ?? null,
    );
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function toDateColumnValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}
