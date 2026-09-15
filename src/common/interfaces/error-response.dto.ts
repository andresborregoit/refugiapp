import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ example: 'RESOURCE_CONFLICT' })
  code!: string;

  @ApiProperty({ example: 'User already exists.' })
  message!: string | string[];

  @ApiProperty({ example: 'Conflict' })
  error!: string;

  @ApiProperty({ example: '2026-09-07T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/v1/users' })
  path!: string;

  @ApiProperty({ example: '7c0c5b2a-3f8e-4b1a-9d2e-1a2b3c4d5e6f', required: false })
  requestId?: string;
}