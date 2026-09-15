import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Veterinarian } from '../../../../domain/entities/veterinarian.entity';
import { VeterinarianRepository } from '../../../../domain/repositories/veterinarian.repository';
import { VeterinarianOrmEntity } from '../entities/veterinarian.orm-entity';

@Injectable()
export class TypeOrmVeterinarianRepository implements VeterinarianRepository {
  constructor(
    @InjectRepository(VeterinarianOrmEntity)
    private readonly repository: Repository<VeterinarianOrmEntity>,
  ) {}

  async findById(id: string): Promise<Veterinarian | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  private toDomain(entity: VeterinarianOrmEntity): Veterinarian {
    return new Veterinarian(
      entity.id,
      entity.firstName,
      entity.lastName,
      entity.licenseNumber,
      entity.isActive,
    );
  }
}
