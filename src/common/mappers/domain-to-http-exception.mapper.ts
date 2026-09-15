import { BadRequestException } from '@nestjs/common';
import { DomainException } from '../exceptions/domain.exception';

export function mapDomainExceptionToBadRequest(error: DomainException): BadRequestException {
  return new BadRequestException({
    code: error.code,
    message: error.message,
  });
}
