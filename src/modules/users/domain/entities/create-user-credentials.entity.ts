import { UserRole } from '../../../../common/enums/user-role.enum';

export class CreateUserCredentials {
  constructor(
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly passwordHash: string,
    public readonly roles: UserRole[],
  ) {}
}
