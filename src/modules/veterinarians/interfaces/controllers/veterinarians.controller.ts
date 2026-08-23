import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('veterinarians')
@Controller('veterinarians')
export class VeterinariansController {}
