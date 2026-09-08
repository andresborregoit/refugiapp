import {
  applyDecorators,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../interfaces/error-response.dto';

export function ApiErrorResponses(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Invalid request.' }),
    ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Authentication failed.' }),
    ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Access denied.' }),
    ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Resource not found.' }),
    ApiConflictResponse({ type: ErrorResponseDto, description: 'Resource conflict.' }),
  );
}
