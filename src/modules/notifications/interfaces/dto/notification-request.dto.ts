import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform } from '../../domain/enums/device-platform.enum';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  expoPushToken!: string;

  @ApiProperty({ enum: DevicePlatform })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  @IsString()
  @MaxLength(64)
  timezone!: string;

  @ApiPropertyOptional({ type: String, example: '1.4.0' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string | null;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  overdueEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  upcomingEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 5, maximum: 1440 })
  @IsOptional()
  upcomingWindowMinutes?: number;

  @ApiPropertyOptional({ type: String, example: '22:00', nullable: true })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'quietStart must use HH:mm 24h format.' })
  quietStart?: string | null;

  @ApiPropertyOptional({ type: String, example: '07:00', nullable: true })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'quietEnd must use HH:mm 24h format.' })
  quietEnd?: string | null;

  @ApiPropertyOptional({ example: 'America/Argentina/Buenos_Aires' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
