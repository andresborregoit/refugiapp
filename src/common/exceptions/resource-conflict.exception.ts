import { ConflictException } from '@nestjs/common';

export class ResourceConflictException extends ConflictException {
  constructor(message: string, code = 'RESOURCE_CONFLICT') {
    super({ code, message });
    this.name = 'ResourceConflictException';
  }
}
