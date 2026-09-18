import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
    description: 'Unique user identifier (UUID).',
  })
  id!: string;

  @ApiProperty({
    type: String,
    format: 'email',
    example: 'manager@refugiapp.local',
    description: 'Login email, unique per user.',
  })
  email!: string;

  @ApiProperty({
    type: String,
    example: 'Sofia',
    description: 'User first name.',
  })
  firstName!: string;

  @ApiProperty({
    type: String,
    example: 'Ramirez',
    description: 'User last name.',
  })
  lastName!: string;

  @ApiProperty({
    enum: UserRole,
    isArray: true,
    example: [UserRole.SHELTER_MANAGER],
    description: 'Roles assigned to the user.',
  })
  roles!: UserRole[];

  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether the user account is active.',
  })
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-09-07T12:00:00.000Z',
    description: 'Creation timestamp.',
  })
  createdAt?: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-09-07T12:00:00.000Z',
    description: 'Last update timestamp.',
  })
  updatedAt?: Date;
}
