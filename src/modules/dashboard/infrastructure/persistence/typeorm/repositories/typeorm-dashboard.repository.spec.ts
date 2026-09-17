import { Repository } from 'typeorm';
import { AnimalStatus } from '../../../../../animals/domain/enums/animal-status.enum';
import { AnimalOrmEntity } from '../../../../../animals/infrastructure/persistence/typeorm/entities/animal.orm-entity';
import { DASHBOARD_RECENT_ANIMALS_LIMIT } from '../../../../domain/repositories/dashboard.repository';
import { TypeOrmDashboardRepository } from './typeorm-dashboard.repository';

describe('TypeOrmDashboardRepository', () => {
  let repository: {
    count: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let dashboardRepository: TypeOrmDashboardRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { status: AnimalStatus.ADMITTED, count: '3' },
        { status: AnimalStatus.DECEASED, count: '1' },
      ]),
    };

    repository = {
      count: jest.fn().mockResolvedValue(7),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    dashboardRepository = new TypeOrmDashboardRepository(
      repository as unknown as Repository<AnimalOrmEntity>,
    );
  });

  it('returns totals with every status present and zero-filled', async () => {
    const overview = await dashboardRepository.getOverview();

    expect(overview.totals.animals).toBe(7);
    expect(overview.totals.byStatus).toEqual({
      admitted: 3,
      under_treatment: 0,
      available_for_adoption: 0,
      adopted: 0,
      deceased: 1,
    });
  });

  it('maps recent animals including profilePhotoMediaId', async () => {
    const entity = Object.assign(new AnimalOrmEntity(), {
      id: 'animal-id',
      name: 'Luna',
      species: 'dog',
      status: AnimalStatus.ADMITTED,
      profilePhotoMediaId: 'media-id',
    });
    repository.find.mockResolvedValue([entity]);

    const overview = await dashboardRepository.getOverview();

    expect(overview.recentAnimals[0]).toMatchObject({
      id: 'animal-id',
      name: 'Luna',
      species: 'dog',
      status: AnimalStatus.ADMITTED,
      profilePhotoMediaId: 'media-id',
    });
  });

  it('normalizes a missing profile photo to null', async () => {
    const entity = Object.assign(new AnimalOrmEntity(), {
      id: 'animal-id-2',
      name: 'Rex',
      species: 'cat',
      status: AnimalStatus.AVAILABLE_FOR_ADOPTION,
      profilePhotoMediaId: null,
    });
    repository.find.mockResolvedValue([entity]);

    const overview = await dashboardRepository.getOverview();

    expect(overview.recentAnimals[0].profilePhotoMediaId).toBeNull();
  });

  it('orders recent animals deterministically and caps the limit', async () => {
    await dashboardRepository.getOverview();

    expect(repository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { createdAt: 'DESC', id: 'DESC' },
        take: DASHBOARD_RECENT_ANIMALS_LIMIT,
      }),
    );
    expect(repository.find.mock.calls[0]![0]).not.toHaveProperty('withDeleted');
  });
});