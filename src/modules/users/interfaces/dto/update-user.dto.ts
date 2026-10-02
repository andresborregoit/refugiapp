import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../../common/enums/user-role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    type: String,
    example: 'Sofia',
    description: 'User first name.',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Ramirez',
    description: 'User last name.',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'email',
    example: 'manager@refugiapp.local',
    description: 'Login email, unique per user. Normalized to lowercase.',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    example: [UserRole.SHELTER_MANAGER],
    description:
      'Roles assigned to the user. Removing the admin role from the last active admin is rejected with 409 LAST_ADMIN_FORBIDDEN.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
