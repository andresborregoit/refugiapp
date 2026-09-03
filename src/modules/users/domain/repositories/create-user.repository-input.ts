import { UserRole } from '../../../../common/enums/user-role.enum';

export interface CreateUserRepositoryInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  isActive: boolean;
}
