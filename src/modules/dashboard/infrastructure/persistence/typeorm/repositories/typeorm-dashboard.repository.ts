import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnimalStatus } from '../../../../../animals/domain/enums/animal-status.enum';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { DashboardAnimal } from '../../../../domain/entities/dashboard-animal.entity';
import {
  DASHBOARD_RECENT_ANIMALS_LIMIT,
  DashboardOverview,
  DashboardRepository,
} from '../../../../domain/repositories/dashboard.repository';

@Injectable()
export class TypeOrmDashboardRepository implements DashboardRepository {
  constructor(
    @InjectRepository(AnimalOrmEntity)
    private readonly animalRepository: Repository<AnimalOrmEntity>,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    const [animals, byStatus, recentEntities] = await Promise.all([
      this.animalRepository.count(),
      this.countAnimalsByStatus(),
      this.animalRepository.find({
        order: { createdAt: 'DESC', id: 'DESC' },
        take: DASHBOARD_RECENT_ANIMALS_LIMIT,
      }),
    ]);

    return {
      totals: { animals, byStatus },
      recentAnimals: recentEntities.map((entity) => this.toDomain(entity)),
    };
  }

  private async countAnimalsByStatus(): Promise<Record<AnimalStatus, number>> {
    const rows = await this.animalRepository
      .createQueryBuilder('animal')
      .select('animal.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('animal.status')
      .getRawMany<{ status: AnimalStatus; count: string }>();

    const counts = Object.values(AnimalStatus).reduce<Record<AnimalStatus, number>>(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<AnimalStatus, number>,
    );

    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    return counts;
  }

  private toDomain(entity: AnimalOrmEntity): DashboardAnimal {
    return new DashboardAnimal(
      entity.id,
      entity.name,
      entity.species,
      entity.status,
      entity.profilePhotoMediaId ?? null,
    );
  }
}