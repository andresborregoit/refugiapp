import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { AnimalSex } from '../../domain/enums/animal-sex.enum';
import { AnimalStatus } from '../../domain/enums/animal-status.enum';

function IsDateOnOrBefore(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isDateOnOrBefore',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null || value === '') {
            return true;
          }

          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[relatedPropertyName];

          if (typeof value !== 'string' || typeof relatedValue !== 'string') {
            return true;
          }

          const valueTime = Date.parse(value);
          const relatedTime = Date.parse(relatedValue);

          if (Number.isNaN(valueTime) || Number.isNaN(relatedTime)) {
            return true;
          }

          return valueTime <= relatedTime;
        },
      },
    });
  };
}

export class CreateAnimalDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'dog' })
  @IsString()
  species!: string;

  @ApiPropertyOptional({ example: 'mixed', nullable: true })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({ enum: AnimalSex, default: AnimalSex.UNKNOWN })
  @IsOptional()
  @IsEnum(AnimalSex)
  sex?: AnimalSex;

  @ApiPropertyOptional({ enum: AnimalStatus, default: AnimalStatus.ADMITTED })
  @IsOptional()
  @IsEnum(AnimalStatus)
  status?: AnimalStatus;

  @ApiProperty()
  @IsDateString()
  intakeDate!: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  @IsOptional()
  @IsDateString()
  @IsDateOnOrBefore('intakeDate', {
    message: 'birthDate must be on or before intakeDate',
  })
  birthDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  profilePhotoMediaId?: string;
}
