import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Animal } from '../../../../domain/entities/animal.entity';
import { INTAKE_EVENT_DESCRIPTION } from '../../../../domain/entities/animal-history-event.entity';
import { CreateAnimal } from '../../../../domain/entities/create-animal.entity';
import { AnimalHistoryEventType } from '../../../../domain/enums/animal-history-event-type.enum';
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
