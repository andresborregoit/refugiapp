import { ArgumentsHost, Catch, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { HttpExceptionFilter } from '../../../../common/filters/http-exception.filter';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { AuditLogsService } from '../../application/services/audit-logs.service';
import { AuditAction } from '../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../domain/enums/audit-resource-type.enum';

@Catch(ForbiddenException)
export class AuditForbiddenFilter extends HttpExceptionFilter {
  constructor(private readonly auditLogsService: AuditLogsService) {
    super();
  }

  catch(exception: ForbiddenException, host: ArgumentsHost): void {
    void this.auditDenial(host);
    super.catch(exception, host);
  }

  private async auditDenial(host: ArgumentsHost): Promise<void> {
    try {
      const request = host
        .switchToHttp()
        .getRequest<Request & { user?: AuthenticatedUser }>();

      await this.auditLogsService.record({
        actorUserId: request.user?.id ?? null,
        action: AuditAction.ACCESS_DENIED,
        resourceType: AuditResourceType.AUTHORIZATION,
        resourceId: null,
        metadata: {
          method: request.method,
          path: request.route?.path ?? request.url,
        },
      });
    } catch {
      // Audit failures must never break the HTTP response.
    }
  }
}