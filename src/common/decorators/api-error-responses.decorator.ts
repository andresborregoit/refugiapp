import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../interfaces/error-response.dto';

type DocumentedErrorStatus =
  | HttpStatus.BAD_REQUEST
  | HttpStatus.UNAUTHORIZED
  | HttpStatus.FORBIDDEN
  | HttpStatus.NOT_FOUND
  | HttpStatus.CONFLICT;

const descriptions: Record<DocumentedErrorStatus, string> = {
  [HttpStatus.BAD_REQUEST]: 'Invalid request.',
  [HttpStatus.UNAUTHORIZED]: 'Authentication is required or credentials are invalid.',
  [HttpStatus.FORBIDDEN]: 'The authenticated user does not have permission.',
  [HttpStatus.NOT_FOUND]: 'The requested resource was not found.',
  [HttpStatus.CONFLICT]: 'The request conflicts with the current resource state.',
};

export function ApiErrorResponses(
  ...statuses: DocumentedErrorStatus[]
): MethodDecorator & ClassDecorator {
  const documentedStatuses: DocumentedErrorStatus[] = statuses.length
    ? statuses
    : [
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.CONFLICT,
      ];

  return applyDecorators(
    ...documentedStatuses.map((status) => {
      const options = { type: ErrorResponseDto, description: descriptions[status] };

      switch (status) {
        case HttpStatus.BAD_REQUEST:
          return ApiBadRequestResponse(options);
        case HttpStatus.UNAUTHORIZED:
          return ApiUnauthorizedResponse(options);
        case HttpStatus.FORBIDDEN:
          return ApiForbiddenResponse(options);
        case HttpStatus.NOT_FOUND:
          return ApiNotFoundResponse(options);
        case HttpStatus.CONFLICT:
          return ApiConflictResponse(options);
        default:
          throw new Error(`Unsupported documented HTTP status: ${status}`);
      }
    }),
  );
}
