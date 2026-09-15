import { Injectable } from '@nestjs/common';
import { APPLICATION_METADATA } from './common/constants/application-metadata';

@Injectable()
export class AppService {
  getHealth(): {
    name: string;
    status: string;
    version: string;
  } {
    return {
      name: APPLICATION_METADATA.name,
      status: 'ok',
      version: APPLICATION_METADATA.version,
    };
  }
}
