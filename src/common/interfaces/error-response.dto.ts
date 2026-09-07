import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ example: 'Bad Request' })
  message!: string;

  @ApiPropertyOptional({
    example: ['email must be an email'],
    type: [String],
  })
  details?: string[];

  @ApiProperty({ example: '2026-09-03T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/auth/login' })
  path!: string;
}
