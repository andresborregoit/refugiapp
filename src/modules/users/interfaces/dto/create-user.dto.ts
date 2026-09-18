import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { PASSWORD_MIN_LENGTH } from '../../../../common/security/password-hasher';

export class CreateUserDto {
  @ApiProperty({ example: 'manager@refugiapp.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({
    type: String,
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    example: 'Refugia-2026-secure',
    writeOnly: true,
    description: 'Plain text password. Never exposed by the API.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiProperty({ type: String, example: 'Sofia', description: 'User first name.' })
  @IsString()
  firstName!: string;

  @ApiProperty({ type: String, example: 'Ramirez', description: 'User last name.' })
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    example: [UserRole.SHELTER_MANAGER],
    description: 'Roles assigned to the user. Defaults to shelter_manager.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
