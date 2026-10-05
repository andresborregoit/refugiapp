import { Animal } from '../../../animals/domain/entities/animal.entity';
import { AnimalSex } from '../../../animals/domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { Adopter } from '../../domain/entities/adopter.entity';
import { Adoption } from '../../domain/entities/adoption.entity';
import { AdoptionApplication } from '../../domain/entities/adoption-application.entity';
import { AdoptionApplicationStatus } from '../../domain/enums/adoption-application-status.enum';
import { AdoptionsService } from './adoptions.service';

describe('AdoptionsService', () => {
  const adoptionRepository = {
    createAdopter: jest.fn(),
    findAdopterById: jest.fn(),
    findAdopterByEmail: jest.fn(),
    createApplication: jest.fn(),
    findApplicationById: jest.fn(),
    listApplicationsByAnimal: jest.fn(),
    completeAdoption: jest.fn(),
    listAdoptionsByAnimal: jest.fn(),
  };
  const animalRepository = { findById: jest.fn() };
  const auditLogsService = { record: jest.fn() };
  let service: AdoptionsService;

  const animal = (status = AnimalStatus.AVAILABLE_FOR_ADOPTION) =>
    new Animal(
      'animal-id',
      'Luna',
      'dog',
      null,
      AnimalSex.FEMALE,
      status,
      new Date('2026-01-01T00:00:00.000Z'),
    );
  const adopter = new Adopter(
    'adopter-id',
    'Ana',
    'Perez',
    'ana@example.com',
    '+5491123456789',
    null,
    new Date(),
    new Date(),
  );
  const application = new AdoptionApplication(
    'application-id',
    'animal-id',
    'adopter-id',
    AdoptionApplicationStatus.PENDING,
    new Date('2026-01-02T00:00:00.000Z'),
    'actor-id',
    null,
    null,
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdoptionsService(
      adoptionRepository as any,
      animalRepository as any,
      auditLogsService as any,
    );
  });

  it('normalizes contact data and audits adopter creation', async () => {
    adoptionRepository.findAdopterByEmail.mockResolvedValue(null);
    adoptionRepository.createAdopter.mockResolvedValue(adopter);

    const result = await service.createAdopter(
      {
        firstName: ' Ana ',
        lastName: ' Perez ',
        email: ' ANA@EXAMPLE.COM ',
        phone: ' +5491123456789 ',
        address: ' Calle 123 ',
      },
      'actor-id',
    );

    expect(adoptionRepository.createAdopter).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@example.com',
      phone: '+5491123456789',
      address: 'Calle 123',
    });
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adopter.create', resourceId: 'adopter-id' }),
    );
    expect(result).toBe(adopter);
  });

  it('rejects duplicate adopter email', async () => {
    adoptionRepository.findAdopterByEmail.mockResolvedValue(adopter);

    await expect(
      service.createAdopter(
        {
          firstName: 'Ana',
          lastName: 'Perez',
          email: 'ana@example.com',
          phone: '+5491123456789',
        },
        'actor-id',
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'ADOPTER_EMAIL_ALREADY_EXISTS' }),
    });
  });

  it('maps a concurrent adopter creation to a conflict', async () => {
    adoptionRepository.findAdopterByEmail.mockResolvedValue(null);
    adoptionRepository.createAdopter.mockResolvedValue(null);

    await expect(
      service.createAdopter(
        {
          firstName: 'Ana',
          lastName: 'Perez',
          email: 'ana@example.com',
          phone: '+5491123456789',
        },
        'actor-id',
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'ADOPTER_EMAIL_ALREADY_EXISTS' }),
    });
  });

  it('creates a pending application only for an available animal', async () => {
    animalRepository.findById.mockResolvedValue(animal());
    adoptionRepository.findAdopterById.mockResolvedValue(adopter);
    adoptionRepository.createApplication.mockResolvedValue(application);

    const result = await service.createApplication(
      'animal-id',
      { adopterId: 'adopter-id', submittedAt: '2026-01-02T00:00:00.000Z' },
      'actor-id',
    );

    expect(result).toBe(application);
    expect(adoptionRepository.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ animalId: 'animal-id', adopterId: 'adopter-id' }),
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adoption_application.create' }),
    );
  });

  it('rejects an application when the animal is not available', async () => {
    animalRepository.findById.mockResolvedValue(animal(AnimalStatus.UNDER_TREATMENT));

    await expect(
      service.createApplication('animal-id', { adopterId: 'adopter-id' }, 'actor-id'),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'ANIMAL_NOT_AVAILABLE_FOR_ADOPTION' }),
    });
  });

  it('rejects a duplicate pending application', async () => {
    animalRepository.findById.mockResolvedValue(animal());
    adoptionRepository.findAdopterById.mockResolvedValue(adopter);
    adoptionRepository.createApplication.mockResolvedValue(null);

    await expect(
      service.createApplication('animal-id', { adopterId: 'adopter-id' }, 'actor-id'),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'ADOPTION_APPLICATION_ALREADY_EXISTS' }),
    });
  });

  it('approves a pending application and audits the adoption', async () => {
    const adoption = new Adoption(
      'adoption-id',
      'animal-id',
      'adopter-id',
      'application-id',
      new Date('2026-01-03T00:00:00.000Z'),
      'actor-id',
      new Date(),
      new Date(),
    );
    adoptionRepository.findApplicationById.mockResolvedValue(application);
    adoptionRepository.completeAdoption.mockResolvedValue({ status: 'completed', adoption });

    const result = await service.approve(
      'application-id',
      { adoptedAt: '2026-01-03T00:00:00.000Z' },
      'actor-id',
    );

    expect(result).toBe(adoption);
    expect(adoptionRepository.completeAdoption).toHaveBeenCalledWith(
      'application-id',
      new Date('2026-01-03T00:00:00.000Z'),
      'actor-id',
    );
    expect(auditLogsService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adoption.complete', resourceId: 'adoption-id' }),
    );
  });

  it('rejects an adoption date before the application', async () => {
    adoptionRepository.findApplicationById.mockResolvedValue(application);

    await expect(
      service.approve(
        'application-id',
        { adoptedAt: '2026-01-01T00:00:00.000Z' },
        'actor-id',
      ),
    ).rejects.toMatchObject({
      status: 400,
      response: expect.objectContaining({ code: 'ADOPTED_AT_BEFORE_APPLICATION' }),
    });
  });

  it('maps a concurrent animal status change to a conflict', async () => {
    adoptionRepository.findApplicationById.mockResolvedValue(application);
    adoptionRepository.completeAdoption.mockResolvedValue({ status: 'animal_not_available' });

    await expect(
      service.approve(
        'application-id',
        { adoptedAt: '2026-01-03T00:00:00.000Z' },
        'actor-id',
      ),
    ).rejects.toMatchObject({
      status: 409,
      response: expect.objectContaining({ code: 'ANIMAL_NOT_AVAILABLE_FOR_ADOPTION' }),
    });
  });
});
