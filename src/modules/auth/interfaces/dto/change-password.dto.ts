import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../../../common/security/password-hasher';

export class ChangePasswordDto {
  @ApiProperty({ format: 'password', writeOnly: true })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ format: 'password', writeOnly: true, minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;
}
