import { UserRole } from '../../../../common/enums/user-role.enum';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly roles: UserRole[],
    public readonly isActive: boolean,
  ) {}
}
