import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '../../../../common/security/password-hasher';

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: 'Opaque, single-use recovery token.', writeOnly: true })
  @IsString()
  token!: string;

  @ApiProperty({ format: 'password', writeOnly: true, minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  newPassword!: string;
}
