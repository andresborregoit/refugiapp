import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    createUser: jest.fn(),
    listUsers: jest.fn(),
    updateUser: jest.fn(),
    deactivateUser: jest.fn(),
    activateUser: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(() => {
    controller = new UsersController(mockUsersService as any);
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('delegates to the service with the authenticated user id', async () => {
      const user = new User(
        'user-id',
        'user@test.com',
        'Test',
        'User',
        [UserRole.VETERINARIAN],
        true,
      );
      mockUsersService.getProfile.mockResolvedValue(user);

      const result = await controller.getMe({
        id: 'user-id',
        email: 'user@test.com',
        roles: [UserRole.VETERINARIAN],
      });

      expect(mockUsersService.getProfile).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(user);
    });

    it('returns the full profile without exposing passwordHash', async () => {
      const user = new User(
        'user-id',
        'user@test.com',
        'Test',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockUsersService.getProfile.mockResolvedValue(user);

      const result = await controller.getMe({
        id: 'user-id',
        email: 'user@test.com',
        roles: [UserRole.SHELTER_MANAGER],
      });

      expect(result).toMatchObject({
        id: 'user-id',
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
        roles: [UserRole.SHELTER_MANAGER],
        isActive: true,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('updateUser', () => {
    it('delegates to the service with id, dto and actor id', async () => {
      const updated = new User(
        'target-id',
        'target@refugiapp.local',
        'Updated',
        'User',
        [UserRole.SHELTER_MANAGER],
        true,
      );
      mockUsersService.updateUser.mockResolvedValue(updated);

      const result = await controller.updateUser(
        'target-id',
        { firstName: 'Updated' },
        { id: 'actor-id', email: 'admin@refugiapp.local', roles: [UserRole.ADMIN] },
      );

      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'target-id',
        { firstName: 'Updated' },
        'actor-id',
      );
      expect(result).toEqual(updated);
      expect(result).not.toHaveProperty('passwordHash');
    });
  });

  describe('listUsers', () => {
    it('delegates the validated pagination query to the service', async () => {
      const query = { page: 2, limit: 10 };
      const result = { items: [], page: 2, limit: 10, total: 0 };
      mockUsersService.listUsers.mockResolvedValue(result);

      await expect(controller.listUsers(query as any)).resolves.toEqual(result);
      expect(mockUsersService.listUsers).toHaveBeenCalledWith(query);
    });
  });
});
