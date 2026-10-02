import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';
import { UsersService } from './users.service';

jest.mock('../../../../common/security/password-hasher');

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

describe('UsersService', () => {
  let service: UsersService;
  const mockRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findCredentialsByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    countActiveAdmins: jest.fn(),
    softDelete: jest.fn(),
    activate: jest.fn(),
  };
  const mockAuditLogsService = {
    record: jest.fn(),
  };

  beforeEach(() => {
    service = new UsersService(mockRepository as any, mockAuditLogsService as any);
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('delegates pagination and returns the repository result', async () => {
      const query = { page: 2, limit: 10 };
      const paginated = { items: [], page: 2, limit: 10, total: 11 };
      mockRepository.findMany.mockResolvedValue(paginated);

      await expect(service.listUsers(query)).resolves.toEqual(paginated);
      expect(mockRepository.findMany).toHaveBeenCalledWith(query);
    });
  });

  describe('createUser', () => {
    const dto: CreateUserDto = {
      email: '  NewUser@refugiapp.local  ',
      password: 'valid-password-12chars',
      firstName: 'New',
      lastName: 'User',
      roles: undefined,
    };

    it('normalizes email to lowercase and trims spaces', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(new User(
        'new-uuid',
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      await service.createUser(dto, 'actor-id');

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('newuser@refugiapp.local');
    });

    it('uses default shelter_manager role when roles are not provided', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockImplementation(async (input) => new User(
        'new-uuid',
        input.email,
        input.firstName,
        input.lastName,
        input.roles,
        true,
      ));

      const result = await service.createUser(dto, 'actor-id');

      expect(result.roles).toEqual([UserRole.SHELTER_MANAGER]);
    });

    it('uses provided roles when given', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockImplementation(async (input) => new User(
        'new-uuid',
        input.email,
        input.firstName,
        input.lastName,
        input.roles,
        true,
      ));

      const dtoWithRoles: CreateUserDto = { ...dto, roles: [UserRole.ADMIN, UserRole.VETERINARIAN] };

      const result = await service.createUser(dtoWithRoles, 'actor-id');

      expect(result.roles).toEqual([UserRole.ADMIN, UserRole.VETERINARIAN]);
    });

    it('hashes the password before persisting', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockImplementation(async (input) => new User(
        'new-uuid',
        input.email,
        input.firstName,
        input.lastName,
        input.roles,
        true,
      ));

      await service.createUser(dto, 'actor-id');

      expect(mockedHashPassword).toHaveBeenCalledWith(dto.password);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed-pw' }),
      );
    });

    it('throws ResourceConflictException when email is already registered', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(new User(
        'existing-uuid',
        'newuser@refugiapp.local',
        'Existing',
        'User',
        [UserRole.ADMIN],
        true,
      ));

      await expect(service.createUser(dto, 'actor-id')).rejects.toThrow(ResourceConflictException);
    });

    it('returns a User without passwordHash', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(new User(
        'new-uuid',
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      const result = await service.createUser(dto, 'actor-id');

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('records a user.create audit event with the actor id', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(new User(
        'new-uuid',
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      await service.createUser(dto, 'actor-id');

      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'new-uuid',
          metadata: expect.objectContaining({ email: 'newuser@refugiapp.local' }),
        }),
      );
    });

    it('records a role assignment audit event when roles are explicitly provided', async () => {
      mockedHashPassword.mockResolvedValue('hashed-pw');
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(new User(
        'new-uuid',
        'newuser@refugiapp.local',
        'New',
        'User',
        [UserRole.ADMIN],
        true,
      ));

      await service.createUser({ ...dto, roles: [UserRole.ADMIN] }, 'actor-id');

      const auditCalls = mockAuditLogsService.record.mock.calls.map((call) => call[0]);
      expect(auditCalls.some((call) => call.action === 'user.role_assign')).toBe(true);
    });
  });

  describe('updateUser', () => {
    const target = new User(
      'target-id',
      'target@refugiapp.local',
      'Target',
      'User',
      [UserRole.SHELTER_MANAGER],
      true,
    );

    it('updates only the provided fields without nulling the rest', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockImplementation(async (_id: string, input: Record<string, unknown>) => new User(
        'target-id',
        'target@refugiapp.local',
        (input.firstName as string) ?? 'Target',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      const result = await service.updateUser('target-id', { firstName: '  Updated  ' }, 'actor-id');

      expect(mockRepository.update).toHaveBeenCalledWith('target-id', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('User');
    });

    it('normalizes a changed email and checks for conflicts', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue(new User(
        'target-id',
        'new@refugiapp.local',
        'Target',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      ));

      await service.updateUser('target-id', { email: '  New@refugiapp.local  ' }, 'actor-id');

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('new@refugiapp.local');
      expect(mockRepository.update).toHaveBeenCalledWith('target-id', { email: 'new@refugiapp.local' });
    });

    it('skips the email conflict check when the email is unchanged', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockResolvedValue(target);

      await service.updateUser('target-id', { email: 'TARGET@refugiapp.local', firstName: 'T' }, 'actor-id');

      expect(mockRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('throws ResourceConflictException when the new email is already registered', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.findByEmail.mockResolvedValue(new User(
        'other-id',
        'taken@refugiapp.local',
        'Other',
        'User',
        [UserRole.ADMIN],
        true,
      ));

      await expect(
        service.updateUser('target-id', { email: 'taken@refugiapp.local' }, 'actor-id'),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('missing-id', { firstName: 'Nope' }, 'actor-id'),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('rejects an empty update payload', async () => {
      mockRepository.findById.mockResolvedValue(target);

      await expect(service.updateUser('target-id', {}, 'actor-id')).rejects.toThrow(
        expect.objectContaining({ status: 400 }),
      );
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('records a role assignment audit event when roles change', async () => {
      const adminTarget = new User(
        'target-id',
        'target@refugiapp.local',
        'Target',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      const promoted = new User(
        'target-id',
        'target@refugiapp.local',
        'Target',
        'User',
        [UserRole.ADMIN],
        true,
      );
      mockRepository.findById.mockResolvedValue(adminTarget);
      mockRepository.update.mockResolvedValue(promoted);

      await service.updateUser('target-id', { roles: [UserRole.ADMIN] }, 'actor-id');

      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'target-id',
          metadata: expect.objectContaining({
            previousRoles: [UserRole.SHELTER_MANAGER],
            roles: [UserRole.ADMIN],
          }),
        }),
      );
      const auditCalls = mockAuditLogsService.record.mock.calls.map((call) => call[0]);
      expect(auditCalls.some((call) => call.action === 'user.role_assign')).toBe(true);
    });

    it('does not audit when only profile fields change', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockResolvedValue(target);

      await service.updateUser('target-id', { firstName: 'Updated' }, 'actor-id');

      expect(mockAuditLogsService.record).not.toHaveBeenCalled();
    });

    it('does not audit when roles are sent unchanged', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockRejectedValue(new Error('should not persist a no-op role update'));

      await expect(
        service.updateUser('target-id', { roles: [UserRole.SHELTER_MANAGER] }, 'actor-id'),
      ).rejects.toThrow(expect.objectContaining({ status: 400 }));
      expect(mockAuditLogsService.record).not.toHaveBeenCalled();
    });

    it('protects the last active admin from losing the admin role', async () => {
      const lastAdmin = new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.ADMIN],
        true,
      );
      mockRepository.findById.mockResolvedValue(lastAdmin);
      mockRepository.countActiveAdmins.mockResolvedValue(0);

      await expect(
        service.updateUser('admin-id', { roles: [UserRole.SHELTER_MANAGER] }, 'other-actor-id'),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.countActiveAdmins).toHaveBeenCalledWith('admin-id');
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('allows demoting an admin when other active admins remain', async () => {
      const admin = new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.ADMIN],
        true,
      );
      const demoted = new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockRepository.findById.mockResolvedValue(admin);
      mockRepository.countActiveAdmins.mockResolvedValue(2);
      mockRepository.update.mockResolvedValue(demoted);

      const result = await service.updateUser(
        'admin-id',
        { roles: [UserRole.SHELTER_MANAGER] },
        'other-actor-id',
      );

      expect(result.roles).toEqual([UserRole.SHELTER_MANAGER]);
      expect(mockAuditLogsService.record).toHaveBeenCalled();
    });

    it('blocks an admin from removing their own admin role', async () => {
      const selfAdmin = new User(
        'self-id',
        'self@refugiapp.local',
        'Self',
        'Admin',
        [UserRole.ADMIN],
        true,
      );
      mockRepository.findById.mockResolvedValue(selfAdmin);
      mockRepository.countActiveAdmins.mockResolvedValue(3);

      await expect(
        service.updateUser('self-id', { roles: [UserRole.SHELTER_MANAGER] }, 'self-id'),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns the full profile of the authenticated user', async () => {
      const user = new User(
        'user-id',
        'user@test.com',
        'Test',
        'User',
        [UserRole.ADMIN],
        true,
      );
      mockRepository.findById.mockResolvedValue(user);

      const result = await service.getProfile('user-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(user);
    });

    it('throws ResourceNotFoundException when the user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('deactivateUser', () => {
    it('throws ResourceNotFoundException when user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateUser('non-existent-id', 'actor-id')).rejects.toThrow(ResourceNotFoundException);
    });

    it('calls repository softDelete with the user id', async () => {
      const user = new User('user-id', 'user@test.com', 'Test', 'User', [UserRole.ADMIN], true);
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.deactivateUser('user-id', 'actor-id');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('user-id');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          resourceId: 'user-id',
        }),
      );
    });
  });

  describe('activateUser', () => {
    it('throws ResourceNotFoundException when user does not exist', async () => {
      mockRepository.activate.mockResolvedValue(null);

      await expect(service.activateUser('non-existent-id', 'actor-id')).rejects.toThrow(ResourceNotFoundException);
    });

    it('returns the reactivated user', async () => {
      const reactivatedUser = new User('user-id', 'user@test.com', 'Test', 'User', [UserRole.ADMIN], true);
      mockRepository.activate.mockResolvedValue(reactivatedUser);

      const result = await service.activateUser('user-id', 'actor-id');

      expect(result).toEqual(reactivatedUser);
    });
  });
});
