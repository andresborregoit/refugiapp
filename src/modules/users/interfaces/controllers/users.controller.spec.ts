import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
    listUsers: jest.fn(),
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
