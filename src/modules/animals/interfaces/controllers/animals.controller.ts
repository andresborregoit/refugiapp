import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('animals')
@Controller('animals')
export class AnimalsController {}
