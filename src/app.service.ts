import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): {
    name: string;
    status: string;
    version: string;
  } {
    return {
      name: 'refugiapp-api',
      status: 'ok',
      version: '0.1.0',
    };
  }
}
