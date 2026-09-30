import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../../../common/security/password-hasher';

export class CreateVeterinarianUserDto {
  @ApiPropertyOptional({
    type: String,
    format: 'email',
    example: 'vet@refugiapp.local',
    description: 'Login email for the new user. Defaults to the veterinarian email when omitted.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    type: String,
    format: 'password',
    minLength: PASSWORD_MIN_LENGTH,
    example: 'Refugia-2026-secure',
    writeOnly: true,
    description: 'Plain text password for the new user. Never exposed by the API.',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Sofia',
    description: 'First name for the new user. Defaults to the veterinarian first name.',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Martinez',
    description: 'Last name for the new user. Defaults to the veterinarian last name.',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}