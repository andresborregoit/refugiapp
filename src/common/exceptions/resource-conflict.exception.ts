import { ConflictException } from '@nestjs/common';

export class ResourceConflictException extends ConflictException {
  constructor(message = 'Resource conflict.', code = 'RESOURCE_CONFLICT') {
    super({
      code,
      message,
    });
  }
}
