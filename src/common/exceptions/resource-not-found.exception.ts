import { NotFoundException } from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resourceName: string, resourceId: string) {
    super({
      code: 'RESOURCE_NOT_FOUND',
      message: `${resourceName} with id ${resourceId} was not found.`,
    });
    this.name = 'ResourceNotFoundException';
  }
}
