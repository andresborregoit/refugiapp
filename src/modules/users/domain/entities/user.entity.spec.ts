import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from './user.entity';

describe('User domain entity', () => {
  it('does not expose passwordHash', () => {
    const user = new User(
      '68c9f1cb-71c8-4c32-b863-6e4c707f4d41',
      'admin@refugiapp.local',
      'Initial',
      'Admin',
      [UserRole.ADMIN],
      true,
    );

    expect(user).not.toHaveProperty('passwordHash');
  });
});
