import { UserRole } from '../../../../common/enums/user-role.enum';

export class UserCredentials {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly roles: UserRole[],
    public readonly isActive: boolean,
  ) {}
}
