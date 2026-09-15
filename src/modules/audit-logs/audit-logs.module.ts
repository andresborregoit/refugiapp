import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsService } from './application/services/audit-logs.service';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository';
import { AuditLogOrmEntity } from './infrastructure/persistence/typeorm/entities/audit-log.orm-entity';
import { TypeOrmAuditLogRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-audit-log.repository';
import { AuditLogsController } from './interfaces/controllers/audit-logs.controller';
import { AuditForbiddenFilter } from './interfaces/filters/audit-forbidden.filter';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogOrmEntity])],
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    AuditForbiddenFilter,
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: TypeOrmAuditLogRepository,
    },
  ],
  exports: [AuditLogsService, AuditForbiddenFilter, AUDIT_LOG_REPOSITORY],
})
export class AuditLogsModule {}