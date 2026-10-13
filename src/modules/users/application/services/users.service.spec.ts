import { ForbiddenException } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { hashPassword } from '../../../../common/security/password-hasher';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { MediaAsset } from '../../../media/domain/entities/media-asset.entity';
import { MediaOwnerType } from '../../../media/domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../../media/domain/enums/media-resource-type.enum';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../../interfaces/dto/create-user.dto';
import { UsersService } from './users.service';

jest.mock('../../../../common/security/password-hasher');

const mockedHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;

const MEDIA_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

function mediaAsset(ownerType: MediaOwnerType | null): MediaAsset {
  return new MediaAsset(
    MEDIA_UUID,
    ownerType,
    ownerType === null ? null : 'owner-id',
    MediaResourceType.IMAGE,
    'public-id',
    'https://cloudinary.com/avatar.jpg',
    1024,
  );
}

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
  const mockMediaService = {
    findById: jest.fn(),
  };
  const mockAuditLogsService = {
    record: jest.fn(),
  };

  beforeEach(() => {
    service = new UsersService(
      mockRepository as any,
      mockMediaService as any,
      mockAuditLogsService as any,
    );
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

    const adminActor = (id = 'actor-id'): AuthenticatedUser => ({
      id,
      email: `${id}@refugiapp.local`,
      roles: [UserRole.ADMIN],
    });

    const roleActor = (id: string, roles: UserRole[]): AuthenticatedUser => ({
      id,
      email: `${id}@refugiapp.local`,
      roles,
    });

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

      const result = await service.updateUser('target-id', { firstName: '  Updated  ' }, adminActor());

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

      await service.updateUser('target-id', { email: '  New@refugiapp.local  ' }, adminActor());

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('new@refugiapp.local');
      expect(mockRepository.update).toHaveBeenCalledWith('target-id', { email: 'new@refugiapp.local' });
    });

    it('skips the email conflict check when the email is unchanged', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockResolvedValue(target);

      await service.updateUser('target-id', { email: 'TARGET@refugiapp.local', firstName: 'T' }, adminActor());

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
        service.updateUser('target-id', { email: 'taken@refugiapp.local' }, adminActor()),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws ResourceNotFoundException when the user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('missing-id', { firstName: 'Nope' }, adminActor()),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('rejects an empty update payload', async () => {
      mockRepository.findById.mockResolvedValue(target);

      await expect(service.updateUser('target-id', {}, adminActor())).rejects.toThrow(
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

      await service.updateUser('target-id', { roles: [UserRole.ADMIN] }, adminActor());

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

      await service.updateUser('target-id', { firstName: 'Updated' }, adminActor());

      expect(mockAuditLogsService.record).not.toHaveBeenCalled();
    });

    it('does not audit when roles are sent unchanged', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockRepository.update.mockRejectedValue(new Error('should not persist a no-op role update'));

      await expect(
        service.updateUser('target-id', { roles: [UserRole.SHELTER_MANAGER] }, adminActor()),
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
        service.updateUser('admin-id', { roles: [UserRole.SHELTER_MANAGER] }, adminActor('other-actor-id')),
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
        adminActor('other-actor-id'),
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
        service.updateUser('self-id', { roles: [UserRole.SHELTER_MANAGER] }, adminActor('self-id')),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('links a new profile photo through the media policy for an admin', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockMediaService.findById.mockResolvedValue(mediaAsset(null));
      mockRepository.update.mockResolvedValue(
        new User(
          'target-id',
          'target@refugiapp.local',
          'Target',
          'User',
          [UserRole.SHELTER_MANAGER],
          true,
          undefined,
          undefined,
          MEDIA_UUID,
        ),
      );

      const result = await service.updateUser(
        'target-id',
        { profilePhotoMediaId: MEDIA_UUID },
        adminActor(),
      );

      expect(mockMediaService.findById).toHaveBeenCalledWith(MEDIA_UUID);
      expect(mockRepository.update).toHaveBeenCalledWith('target-id', {
        profilePhotoMediaId: MEDIA_UUID,
      });
      expect(result.profilePhotoMediaId).toBe(MEDIA_UUID);
    });

    it('throws ResourceNotFoundException when the profile photo asset does not exist', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockMediaService.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('target-id', { profilePhotoMediaId: MEDIA_UUID }, adminActor()),
      ).rejects.toThrow(ResourceNotFoundException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('rejects a profile photo asset with an incompatible owner type', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockMediaService.findById.mockResolvedValue(mediaAsset(MediaOwnerType.ANIMAL));

      await expect(
        service.updateUser('target-id', { profilePhotoMediaId: MEDIA_UUID }, adminActor()),
      ).rejects.toThrow(ResourceConflictException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('clears the profile photo when null is provided without hitting media', async () => {
      const withPhoto = new User(
        'target-id',
        'target@refugiapp.local',
        'Target',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
        undefined,
        undefined,
        MEDIA_UUID,
      );
      mockRepository.findById.mockResolvedValue(withPhoto);
      mockRepository.update.mockResolvedValue(target);

      await service.updateUser('target-id', { profilePhotoMediaId: null }, adminActor());

      expect(mockMediaService.findById).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith('target-id', {
        profilePhotoMediaId: null,
      });
    });

    it('forbids a non-admin from updating another user', async () => {
      mockRepository.findById.mockResolvedValue(target);

      await expect(
        service.updateUser(
          'target-id',
          { profilePhotoMediaId: null },
          roleActor('other-id', [UserRole.SHELTER_MANAGER]),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('forbids a non-admin from editing their own profile fields', async () => {
      mockRepository.findById.mockResolvedValue(target);

      await expect(
        service.updateUser(
          'target-id',
          { firstName: 'Nope' },
          roleActor('target-id', [UserRole.VETERINARIAN]),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('allows a non-admin to update only their own profile photo', async () => {
      mockRepository.findById.mockResolvedValue(target);
      mockMediaService.findById.mockResolvedValue(mediaAsset(null));
      mockRepository.update.mockResolvedValue(
        new User(
          'target-id',
          'target@refugiapp.local',
          'Target',
          'User',
          [UserRole.SHELTER_MANAGER],
          true,
          undefined,
          undefined,
          MEDIA_UUID,
        ),
      );

      const result = await service.updateUser(
        'target-id',
        { profilePhotoMediaId: MEDIA_UUID },
        roleActor('target-id', [UserRole.SHELTER_MANAGER]),
      );

      expect(result.profilePhotoMediaId).toBe(MEDIA_UUID);
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

  describe('deleteUser', () => {
    it('throws ResourceNotFoundException when the user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deleteUser('missing-id', 'actor-id')).rejects.toThrow(
        ResourceNotFoundException,
      );
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });

    it('soft deletes the user and audits user.delete without secrets', async () => {
      const user = new User(
        'user-id',
        'user@refugiapp.local',
        'Test',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteUser('user-id', 'actor-id');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('user-id');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'actor-id',
          action: AuditAction.USER_DELETE,
          resourceType: AuditResourceType.USER,
          resourceId: 'user-id',
          metadata: expect.objectContaining({
            email: 'user@refugiapp.local',
            roles: [UserRole.SHELTER_MANAGER],
            previousIsActive: true,
          }),
        }),
      );
      const auditPayload = mockAuditLogsService.record.mock.calls[0][0];
      expect(auditPayload.metadata).not.toHaveProperty('passwordHash');
      expect(mockRepository.countActiveAdmins).not.toHaveBeenCalled();
    });

    it('blocks deleting the last active admin with LAST_ADMIN_FORBIDDEN', async () => {
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

      await expect(service.deleteUser('admin-id', 'actor-id')).rejects.toThrow(
        ResourceConflictException,
      );
      expect(mockRepository.countActiveAdmins).toHaveBeenCalledWith('admin-id');
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
      expect(mockAuditLogsService.record).not.toHaveBeenCalled();
    });

    it('allows deleting an admin when other active admins remain', async () => {
      const admin = new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.ADMIN],
        true,
      );
      mockRepository.findById.mockResolvedValue(admin);
      mockRepository.countActiveAdmins.mockResolvedValue(1);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteUser('admin-id', 'actor-id');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('admin-id');
      expect(mockAuditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_DELETE, resourceId: 'admin-id' }),
      );
    });

    it('does not count active admins when deleting an inactive admin', async () => {
      const inactiveAdmin = new User(
        'admin-id',
        'admin@refugiapp.local',
        'Admin',
        'One',
        [UserRole.ADMIN],
        false,
      );
      mockRepository.findById.mockResolvedValue(inactiveAdmin);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.deleteUser('admin-id', 'actor-id');

      expect(mockRepository.countActiveAdmins).not.toHaveBeenCalled();
      expect(mockRepository.softDelete).toHaveBeenCalledWith('admin-id');
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
