import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Species } from '../../../../domain/entities/species.entity';
import { SpeciesRepository } from '../../../../domain/repositories/species.repository';
import { SpeciesOrmEntity } from '../entities/species.orm-entity';

@Injectable()
export class TypeOrmSpeciesRepository implements SpeciesRepository {
  constructor(
    @InjectRepository(SpeciesOrmEntity)
    private readonly repository: Repository<SpeciesOrmEntity>,
  ) {}

  async findActiveOrdered(): Promise<Species[]> {
    const entities = await this.repository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async findById(id: string): Promise<Species | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: SpeciesOrmEntity): Species {
    return new Species(
      entity.id,
      entity.slug,
      entity.labelEs,
      entity.isActive,
      entity.sortOrder,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}