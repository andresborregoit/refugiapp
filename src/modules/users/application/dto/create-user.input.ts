import { UserRole } from '../../../../common/enums/user-role.enum';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles?: UserRole[];
}
