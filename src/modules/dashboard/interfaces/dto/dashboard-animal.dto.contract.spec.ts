import { instanceToPlain, plainToInstance } from 'class-transformer';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { DashboardAnimalDto } from './dashboard-animal.dto';

describe('DashboardAnimalDto contract', () => {
  it('serializes every repository field without dropping profilePhotoMediaId', () => {
    const repositoryPayload = {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Luna',
      species: 'dog',
      status: AnimalStatus.ADMITTED,
      profilePhotoMediaId: null,
    };

    const dto = plainToInstance(DashboardAnimalDto, repositoryPayload);

    expect(dto).toEqual(repositoryPayload);
    expect(instanceToPlain(dto)).toEqual(repositoryPayload);
    expect(Object.keys(instanceToPlain(dto)).sort()).toEqual(
      Object.keys(repositoryPayload).sort(),
    );
  });

  it('keeps the profile photo media id when the repository returns one', () => {
    const mediaId = '22222222-2222-4222-8222-222222222222';
    const dto = plainToInstance(DashboardAnimalDto, {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'Rex',
      species: 'cat',
      status: AnimalStatus.AVAILABLE_FOR_ADOPTION,
      profilePhotoMediaId: mediaId,
    });

    expect(dto.profilePhotoMediaId).toBe(mediaId);
    expect(instanceToPlain(dto).profilePhotoMediaId).toBe(mediaId);
  });
});