import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Animal } from '../../../../domain/entities/animal.entity';
import { AnimalRepository } from '../../../../domain/repositories/animal.repository';
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

  private toDomain(entity: AnimalOrmEntity): Animal {
    return new Animal(
      entity.id,
      entity.name,
      entity.species,
      entity.sex,
      entity.status,
      new Date(entity.intakeDate),
    );
  }
}
