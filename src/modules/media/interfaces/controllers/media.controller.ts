import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('media')
@Controller('media')
export class MediaController {}
