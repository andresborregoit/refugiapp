import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Breed } from '../../../../domain/entities/breed.entity';
import { BreedRepository } from '../../../../domain/repositories/breed.repository';
import { BreedOrmEntity } from '../entities/breed.orm-entity';

@Injectable()
export class TypeOrmBreedRepository implements BreedRepository {
  constructor(
    @InjectRepository(BreedOrmEntity)
    private readonly repository: Repository<BreedOrmEntity>,
  ) {}

  async findActiveBySpeciesIdOrdered(speciesId: string): Promise<Breed[]> {
    const entities = await this.repository.find({
      where: { speciesId, isActive: true },
      order: { labelEs: 'ASC', id: 'ASC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: BreedOrmEntity): Breed {
    return new Breed(
      entity.id,
      entity.speciesId,
      entity.slug,
      entity.labelEs,
      entity.isActive,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}