import { DashboardAnimal } from '../../domain/entities/dashboard-animal.entity';
import { DashboardRepository } from '../../domain/repositories/dashboard.repository';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  const repository: { getOverview: jest.Mock } = { getOverview: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DashboardService(repository as unknown as DashboardRepository);
  });

  it('delegates the overview to the dashboard repository', async () => {
    const overview = {
      totals: {
        animals: 3,
        byStatus: {
          admitted: 1,
          under_treatment: 1,
          available_for_adoption: 1,
          adopted: 0,
          deceased: 0,
        } as Record<AnimalStatus, number>,
      },
      recentAnimals: [
        new DashboardAnimal('animal-id', 'Luna', 'dog', AnimalStatus.ADMITTED, null),
      ],
    };
    repository.getOverview.mockResolvedValue(overview);

    await expect(service.getOverview()).resolves.toEqual(overview);
    expect(repository.getOverview).toHaveBeenCalledTimes(1);
  });
});