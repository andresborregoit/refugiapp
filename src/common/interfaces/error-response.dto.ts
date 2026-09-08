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
}
