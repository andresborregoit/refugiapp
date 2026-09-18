import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnimalsModule } from '../animals/animals.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CareTasksService } from './application/services/care-tasks.service';
import { CARE_TASK_REPOSITORY } from './domain/repositories/care-task.repository';
import { CareTaskOrmEntity } from './infrastructure/persistence/typeorm/entities/care-task.orm-entity';
import { TypeOrmCareTaskRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-care-task.repository';
import { CareTasksController } from './interfaces/controllers/care-tasks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CareTaskOrmEntity]), AnimalsModule, AuditLogsModule],
  controllers: [CareTasksController],
  providers: [
    CareTasksService,
    {
      provide: CARE_TASK_REPOSITORY,
      useClass: TypeOrmCareTaskRepository,
    },
  ],
  exports: [CareTasksService, CARE_TASK_REPOSITORY],
})
export class CareTasksModule {}