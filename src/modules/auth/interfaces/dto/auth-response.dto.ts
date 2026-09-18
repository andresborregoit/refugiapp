import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: '1d' })
  expiresIn!: string;

  @ApiProperty({
    description: 'Opaque refresh token for silent rotation. Store it securely on the client.',
  })
  refreshToken!: string;
}