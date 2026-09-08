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
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findCredentialsByEmail: jest.fn(),
    create: jest.fn(),
    softDelete: jest.fn(),
    activate: jest.fn(),
  };

  beforeEach(() => {
    service = new UsersService(mockRepository as any);
    jest.clearAllMocks();
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

      await service.createUser(dto);

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

      const result = await service.createUser(dto);

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

      const result = await service.createUser(dtoWithRoles);

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

      await service.createUser(dto);

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

      await expect(service.createUser(dto)).rejects.toThrow(ResourceConflictException);
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

      const result = await service.createUser(dto);

      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('deactivateUser', () => {
    it('throws ResourceNotFoundException when user does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.deactivateUser('non-existent-id')).rejects.toThrow(ResourceNotFoundException);
    });

    it('calls repository softDelete with the user id', async () => {
      const user = new User('user-id', 'user@test.com', 'Test', 'User', [UserRole.ADMIN], true);
      mockRepository.findById.mockResolvedValue(user);
      mockRepository.softDelete.mockResolvedValue(undefined);

      await service.deactivateUser('user-id');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('user-id');
    });
  });

  describe('activateUser', () => {
    it('throws ResourceNotFoundException when user does not exist', async () => {
      mockRepository.activate.mockResolvedValue(null);

      await expect(service.activateUser('non-existent-id')).rejects.toThrow(ResourceNotFoundException);
    });

    it('returns the reactivated user', async () => {
      const reactivatedUser = new User('user-id', 'user@test.com', 'Test', 'User', [UserRole.ADMIN], true);
      mockRepository.activate.mockResolvedValue(reactivatedUser);

      const result = await service.activateUser('user-id');

      expect(result).toEqual(reactivatedUser);
    });
  });
});
