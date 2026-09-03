import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { User } from '../../domain/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'manager@refugiapp.local' })
  email!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ enum: UserRole, isArray: true })
  roles!: UserRole[];

  @ApiProperty()
  isActive!: boolean;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
    };
  }
}
