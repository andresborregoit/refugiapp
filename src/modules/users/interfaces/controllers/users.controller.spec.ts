import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../domain/entities/user.entity';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  const mockUsersService = {
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
});