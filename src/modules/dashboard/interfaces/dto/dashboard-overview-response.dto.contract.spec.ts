import { plainToInstance } from 'class-transformer';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { DashboardOverviewResponseDto } from './dashboard-overview-response.dto';

describe('DashboardOverviewResponseDto contract', () => {
  const repositoryPayload = {
    totals: {
      animals: 1,
      byStatus: {
        admitted: 1,
        under_treatment: 0,
        available_for_adoption: 0,
        adopted: 0,
        deceased: 0,
      },
    },
    recentAnimals: [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'Luna',
        species: 'dog',
        status: AnimalStatus.ADMITTED,
        profilePhotoMediaId: null,
      },
    ],
  };

  it('mirrors the repository overview payload shape', () => {
    const dto = plainToInstance(DashboardOverviewResponseDto, repositoryPayload);

    expect(dto).toEqual(repositoryPayload);
    expect(dto.totals).toHaveProperty('animals');
    expect(dto.totals).toHaveProperty('byStatus');
    expect(dto.recentAnimals[0]).toHaveProperty('profilePhotoMediaId');
  });
});