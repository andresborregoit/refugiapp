import { DomainException } from './domain.exception';

export class ResourceNotFoundException extends DomainException {
  constructor(resourceName: string, resourceId: string) {
    super(`${resourceName} with id ${resourceId} was not found.`, 'RESOURCE_NOT_FOUND');
    this.name = 'ResourceNotFoundException';
  }
}
