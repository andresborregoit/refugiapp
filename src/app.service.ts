import { Injectable } from '@nestjs/common';
import { APP_NAME, APP_VERSION } from './common/constants/app-metadata';

@Injectable()
export class AppService {
  getHealth(): {
    name: string;
    status: string;
    version: string;
  } {
    return {
      name: APP_NAME,
      status: 'ok',
      version: APP_VERSION,
    };
  }
}
