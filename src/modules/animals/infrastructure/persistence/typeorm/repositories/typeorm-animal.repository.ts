import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Animal } from '../../../../domain/entities/animal.entity';
import {
  AnimalListQuery,
  AnimalRepository,
  PaginatedAnimals,
} from '../../../../domain/repositories/animal.repository';
import { AnimalOrmEntity } from '../entities/animal.orm-entity';

@Injectable()
export class TypeOrmAnimalRepository implements AnimalRepository {
  constructor(
    @InjectRepository(AnimalOrmEntity)
    private readonly repository: Repository<AnimalOrmEntity>,
  ) {}

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
