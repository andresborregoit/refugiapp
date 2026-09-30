import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CreateVeterinarianUserDto } from './create-veterinarian-user.dto';

export class CreateVeterinarianDto {
  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty()
  @IsString()
  licenseNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    format: 'uuid',
    example: '22222222-2222-4222-8222-222222222222',
    description:
      'Id of an existing user to link. Mutually exclusive with createUser. Prefer createUser over typing a raw UUID.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({
    type: CreateVeterinarianUserDto,
    description:
      'Creates a user with the veterinarian role and links it in the same transaction. If the email already exists on an unlinked user, it is reused and the veterinarian role is granted.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateVeterinarianUserDto)
  createUser?: CreateVeterinarianUserDto;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}