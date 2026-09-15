import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('medical-records')
@Controller('medical-records')
export class MedicalRecordsController {}
