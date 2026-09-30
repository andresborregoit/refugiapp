import { BadRequestException } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { UsersService } from '../../../users/application/services/users.service';
import { User } from '../../../users/domain/entities/user.entity';
import { CreateVeterinarian } from '../../domain/entities/create-veterinarian.entity';
import { UpdateVeterinarian } from '../../domain/entities/update-veterinarian.entity';
import { Veterinarian } from '../../domain/entities/veterinarian.entity';
import { CreateVeterinarianDto } from '../../interfaces/dto/create-veterinarian.dto';
import { UpdateVeterinarianDto } from '../../interfaces/dto/update-veterinarian.dto';
import { VeterinariansService } from './veterinarians.service';

describe('VeterinariansService', () => {
  const actorId = 'actor-id';
  const veterinarian = new Veterinarian(
    'veterinarian-id',
    null,
    'Sofia',
    'Martinez',
    'VET-001',
    'sofia@refugiapp.local',
    '+5491100000000',
    'Clinical lead',
    true,
  );
  const user = new User(
    'user-id',
    'sofia.user@refugiapp.local',
    'Sofia',
    'Martinez',
    [UserRole.VETERINARIAN],
    true,
  );
  const userWithoutRole = new User(
    'user-id',
    'sofia.user@refugiapp.local',
    'Sofia',
    'Martinez',
    [UserRole.SHELTER_MANAGER],
    true,
  );
  const veterinarianRepository = {
    create: jest.fn(),
    createWithUser: jest.fn(),
    findById: jest.fn(),
    findByLicenseNumber: jest.fn(),
    findByUserId: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  const usersService = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
  };
  const auditLogsService = {
    record: jest.fn(),
  };
  let service: VeterinariansService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VeterinariansService(
      veterinarianRepository,
      usersService as unknown as UsersService,
      auditLogsService as unknown as AuditLogsService,
    );
  });

  describe('create', () => {
    function createDto(overrides: Partial<CreateVeterinarianDto> = {}): CreateVeterinarianDto {
      return Object.assign(new CreateVeterinarianDto(), {
        firstName: ' Sofia ',
        lastName: ' Martinez ',
        licenseNumber: ' VET-001 ',
        ...overrides,
      });
    }

    it('creates a veterinarian without user credentials', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      veterinarianRepository.create.mockResolvedValue(veterinarian);

      const result = await service.create(createDto(), actorId);

      expect(usersService.findById).not.toHaveBeenCalled();
      expect(veterinarianRepository.create).toHaveBeenCalledWith(expect.any(CreateVeterinarian));

      const input = veterinarianRepository.create.mock.calls[0]![0] as CreateVeterinarian;

      expect(input).toMatchObject({
        firstName: 'Sofia',
        lastName: 'Martinez',
        licenseNumber: 'VET-001',
        userId: null,
        email: null,
        phone: null,
        notes: null,
      });
      expect(result).toBe(veterinarian);
      expect(auditLogsService.record).not.toHaveBeenCalled();
    });

    it('creates a veterinarian linked to an existing user', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      veterinarianRepository.findByUserId.mockResolvedValue(null);
      usersService.findById.mockResolvedValue(user);
      veterinarianRepository.createWithUser.mockResolvedValue({ veterinarian, user });

      const result = await service.create(
        createDto({
          userId: 'user-id',
          email: ' SOFIA@REFUGIAPP.LOCAL ',
          phone: ' +5491100000000 ',
          notes: ' Clinical lead ',
        }),
        actorId,
      );

      expect(usersService.findById).toHaveBeenCalledWith('user-id');
      expect(veterinarianRepository.findByUserId).toHaveBeenCalledWith('user-id');
      expect(veterinarianRepository.createWithUser).toHaveBeenCalledWith(
        expect.objectContaining({ linkUserId: 'user-id' }),
      );
      expect(veterinarianRepository.createWithUser).not.toHaveBeenCalledWith(
        expect.objectContaining({ createUser: expect.anything() }),
      );

      const input = veterinarianRepository.createWithUser.mock.calls[0]![0].veterinarian as CreateVeterinarian;

      expect(input).toMatchObject({
        firstName: 'Sofia',
        lastName: 'Martinez',
        licenseNumber: 'VET-001',
        userId: 'user-id',
        email: 'sofia@refugiapp.local',
        phone: '+5491100000000',
        notes: 'Clinical lead',
      });
      expect(result).toBe(veterinarian);
    });

    it('creates a user with the veterinarian role and links it in the same transaction', async () => {
      const createdUser = new User(
        'created-user-id',
        'vet@refugiapp.local',
        'Sofia',
        'Martinez',
        [UserRole.VETERINARIAN],
        true,
      );
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(null);
      veterinarianRepository.createWithUser.mockResolvedValue({ veterinarian, user: createdUser });

      await service.create(
        createDto({
          email: 'vet@refugiapp.local',
          createUser: {
            password: 'Refugia-2026-secure',
            firstName: ' Sofia ',
            lastName: ' Martinez ',
          },
        }),
        actorId,
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith('vet@refugiapp.local');
      expect(veterinarianRepository.createWithUser).toHaveBeenCalledWith(
        expect.objectContaining({
          createUser: expect.objectContaining({
            email: 'vet@refugiapp.local',
            firstName: 'Sofia',
            lastName: 'Martinez',
          }),
        }),
      );

      const createUserInput = veterinarianRepository.createWithUser.mock.calls[0]![0].createUser;

      expect(createUserInput.passwordHash).toEqual(expect.any(String));
      expect(createUserInput.passwordHash).not.toBe('Refugia-2026-secure');
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: actorId,
          action: AuditAction.USER_CREATE,
          resourceType: AuditResourceType.USER,
          resourceId: createdUser.id,
          metadata: { email: createdUser.email, roles: createdUser.roles },
        }),
      );
    });

    it('reuses an existing unlinked user by email and grants the veterinarian role', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(userWithoutRole);
      veterinarianRepository.findByUserId.mockResolvedValue(null);
      veterinarianRepository.createWithUser.mockResolvedValue({ veterinarian, user: userWithoutRole });

      await service.create(
        createDto({
          createUser: {
            email: 'sofia.user@refugiapp.local',
            password: 'Refugia-2026-secure',
          },
        }),
        actorId,
      );

      expect(veterinarianRepository.createWithUser).toHaveBeenCalledWith(
        expect.objectContaining({
          linkUserId: 'user-id',
          ensureRole: UserRole.VETERINARIAN,
        }),
      );
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_ROLE_ASSIGN,
          resourceType: AuditResourceType.USER,
          resourceId: 'user-id',
          metadata: {
            email: userWithoutRole.email,
            roles: [UserRole.SHELTER_MANAGER, UserRole.VETERINARIAN],
          },
        }),
      );
    });

    it('does not audit role assignment when the reused user already has the veterinarian role', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(user);
      veterinarianRepository.findByUserId.mockResolvedValue(null);
      veterinarianRepository.createWithUser.mockResolvedValue({ veterinarian, user });

      await service.create(
        createDto({
          createUser: {
            email: 'sofia.user@refugiapp.local',
            password: 'Refugia-2026-secure',
          },
        }),
        actorId,
      );

      expect(auditLogsService.record).not.toHaveBeenCalled();
    });

    it('throws ResourceConflictException when the reused user is already linked to another veterinarian', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findByEmail.mockResolvedValue(user);
      veterinarianRepository.findByUserId.mockResolvedValue(veterinarian);

      await expect(
        service.create(
          createDto({
            createUser: {
              email: 'sofia.user@refugiapp.local',
              password: 'Refugia-2026-secure',
            },
          }),
          actorId,
        ),
      ).rejects.toThrow(ResourceConflictException);
      expect(veterinarianRepository.createWithUser).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when userId and createUser are both present', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);

      await expect(
        service.create(
          createDto({
            userId: 'user-id',
            createUser: { password: 'Refugia-2026-secure' },
          }),
          actorId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(veterinarianRepository.create).not.toHaveBeenCalled();
      expect(veterinarianRepository.createWithUser).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when createUser has no email and the profile has none', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);

      await expect(
        service.create(createDto({ createUser: { password: 'Refugia-2026-secure' } }), actorId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ResourceConflictException when licenseNumber is duplicated', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(veterinarian);

      await expect(service.create(createDto(), actorId)).rejects.toThrow(ResourceConflictException);
      expect(veterinarianRepository.create).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when linked user does not exist', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findById.mockResolvedValue(null);

      await expect(service.create(createDto({ userId: 'missing-user-id' }), actorId)).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(veterinarianRepository.createWithUser).not.toHaveBeenCalled();
    });

    it('throws ResourceConflictException when user is already linked', async () => {
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      usersService.findById.mockResolvedValue(user);
      veterinarianRepository.findByUserId.mockResolvedValue(veterinarian);

      await expect(service.create(createDto({ userId: 'user-id' }), actorId)).rejects.toThrow(
        ResourceConflictException,
      );
      expect(veterinarianRepository.createWithUser).not.toHaveBeenCalled();
    });
  });

  it('delegates paginated queries to the repository', async () => {
    const query = { page: 1, limit: 20, isActive: true };
    const result = { items: [veterinarian], page: 1, limit: 20, total: 1 };
    veterinarianRepository.findMany.mockResolvedValue(result);

    await expect(service.list(query)).resolves.toEqual(result);
    expect(veterinarianRepository.findMany).toHaveBeenCalledWith(query);
  });

  it('returns a veterinarian by id', async () => {
    veterinarianRepository.findById.mockResolvedValue(veterinarian);

    await expect(service.findById('veterinarian-id')).resolves.toBe(veterinarian);
  });

  it('throws ResourceNotFoundException when the veterinarian does not exist', async () => {
    veterinarianRepository.findById.mockResolvedValue(null);

    await expect(service.findById('missing-id')).rejects.toThrow(ResourceNotFoundException);
  });

  describe('update', () => {
    function updateDto(overrides: Partial<UpdateVeterinarianDto> = {}): UpdateVeterinarianDto {
      return Object.assign(new UpdateVeterinarianDto(), overrides);
    }

    it('updates professional data', async () => {
      veterinarianRepository.findById.mockResolvedValue(veterinarian);
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(null);
      veterinarianRepository.update.mockResolvedValue({ ...veterinarian, licenseNumber: 'VET-002' });

      await service.update(
        'veterinarian-id',
        updateDto({
          firstName: ' Sofia ',
          licenseNumber: ' VET-002 ',
          email: ' SOFIA.NEW@REFUGIAPP.LOCAL ',
        }),
      );

      expect(veterinarianRepository.update).toHaveBeenCalledWith(
        'veterinarian-id',
        expect.any(UpdateVeterinarian),
      );

      const input = veterinarianRepository.update.mock.calls[0]![1] as UpdateVeterinarian;

      expect(input).toMatchObject({
        firstName: 'Sofia',
        licenseNumber: 'VET-002',
        email: 'sofia.new@refugiapp.local',
      });
    });

    it('allows unlinking the optional userId', async () => {
      veterinarianRepository.findById.mockResolvedValue(veterinarian);
      veterinarianRepository.update.mockResolvedValue({ ...veterinarian, userId: null });

      await service.update('veterinarian-id', updateDto({ userId: null }));

      expect(usersService.findById).not.toHaveBeenCalled();
      expect(veterinarianRepository.update).toHaveBeenCalledWith(
        'veterinarian-id',
        expect.objectContaining({ userId: null }),
      );
    });

    it('throws ResourceConflictException when another veterinarian owns the licenseNumber', async () => {
      veterinarianRepository.findById.mockResolvedValue(veterinarian);
      veterinarianRepository.findByLicenseNumber.mockResolvedValue(
        new Veterinarian('other-id', null, 'Other', 'Vet', 'VET-002', null, null, null, true),
      );

      await expect(
        service.update('veterinarian-id', updateDto({ licenseNumber: 'VET-002' })),
      ).rejects.toThrow(ResourceConflictException);
      expect(veterinarianRepository.update).not.toHaveBeenCalled();
    });
  });

  it('deactivates a veterinarian without deleting it', async () => {
    veterinarianRepository.deactivate.mockResolvedValue({ ...veterinarian, isActive: false });

    await service.deactivate('veterinarian-id');

    expect(veterinarianRepository.deactivate).toHaveBeenCalledWith('veterinarian-id');
  });

  it('throws ResourceNotFoundException when deactivating a missing veterinarian', async () => {
    veterinarianRepository.deactivate.mockResolvedValue(null);

    await expect(service.deactivate('missing-id')).rejects.toThrow(ResourceNotFoundException);
  });
});