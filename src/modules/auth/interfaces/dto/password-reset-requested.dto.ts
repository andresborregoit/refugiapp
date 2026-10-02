import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestedDto {
  @ApiProperty({
    example: 'If an active account exists, password recovery instructions will be sent.',
  })
  message!: string;
}
