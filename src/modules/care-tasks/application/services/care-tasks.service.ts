import { Inject, Injectable } from '@nestjs/common';
import { ResourceConflictException } from '../../../../common/exceptions/resource-conflict.exception';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { ANIMAL_REPOSITORY, AnimalRepository } from '../../../animals/domain/repositories/animal.repository';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { CreateCareTask } from '../../domain/entities/create-care-task.entity';
import { CareTask } from '../../domain/entities/care-task.entity';
import { UpdateCareTask } from '../../domain/entities/update-care-task.entity';
import {
  CARE_TASK_REPOSITORY,
  CareTaskListQuery,
  CareTaskRepository,
  PaginatedCareTasks,
} from '../../domain/repositories/care-task.repository';
import { canCancelCareTask, canCompleteCareTask } from '../../domain/services/care-task-status-transitions';
import { CreateCareTaskDto } from '../../interfaces/dto/create-care-task.dto';
import { ListCareTasksQueryDto } from '../../interfaces/dto/list-care-tasks.query.dto';
import { UpdateCareTaskDto } from '../../interfaces/dto/update-care-task.dto';

@Injectable()
export class CareTasksService {
  constructor(
    @Inject(CARE_TASK_REPOSITORY)
    private readonly careTaskRepository: CareTaskRepository,
    @Inject(ANIMAL_REPOSITORY)
    private readonly animalRepository: AnimalRepository,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateCareTaskDto, actorId: string): Promise<CareTask> {
    const animal = await this.animalRepository.findById(dto.animalId);

    if (!animal) {
      throw new ResourceNotFoundException('Animal', dto.animalId);
    }

    const input = new CreateCareTask(
      dto.animalId,
      dto.title.trim(),
      normalizeOptionalText(dto.description) ?? null,
      dto.dueAt ? new Date(dto.dueAt) : null,
      actorId,
    );

    const created = await this.careTaskRepository.create(input);

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.CARE_TASK_CREATE,
      resourceType: AuditResourceType.CARE_TASK,
      resourceId: created.id,
      metadata: {
        animalId: created.animalId,
        title: created.title,
      },
    });

    return created;
  }

  async findById(id: string): Promise<CareTask> {
    const task = await this.careTaskRepository.findById(id);

    if (!task) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    return task;
  }

  async list(query: ListCareTasksQueryDto): Promise<PaginatedCareTasks> {
    if (query.animalId) {
      const animal = await this.animalRepository.findById(query.animalId);

      if (!animal) {
        throw new ResourceNotFoundException('Animal', query.animalId);
      }
    }

    const repositoryQuery: CareTaskListQuery = {
      page: query.page,
      limit: query.limit,
      animalId: query.animalId,
      status: query.status,
    };

    return this.careTaskRepository.findMany(repositoryQuery);
  }

  async update(id: string, dto: UpdateCareTaskDto, actorId: string): Promise<CareTask> {
    const task = await this.careTaskRepository.findById(id);

    if (!task) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    const input = new UpdateCareTask(
      dto.title?.trim(),
      normalizeOptionalText(dto.description),
      dto.dueAt === undefined ? undefined : dto.dueAt === null ? null : new Date(dto.dueAt),
    );

    const updated = await this.careTaskRepository.update(id, input);

    if (!updated) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.CARE_TASK_UPDATE,
      resourceType: AuditResourceType.CARE_TASK,
      resourceId: id,
      metadata: {
        animalId: updated.animalId,
      },
    });

    return updated;
  }

  async complete(id: string, actorId: string): Promise<CareTask> {
    const task = await this.careTaskRepository.findById(id);

    if (!task) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    if (!canCompleteCareTask(task.status)) {
      throw new ResourceConflictException(
        'Only pending care tasks can be completed.',
        'CARE_TASK_NOT_PENDING',
      );
    }

    const completed = await this.careTaskRepository.complete(id);

    if (!completed) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.CARE_TASK_COMPLETE,
      resourceType: AuditResourceType.CARE_TASK,
      resourceId: id,
      metadata: {
        animalId: completed.animalId,
        completedAt: completed.completedAt,
      },
    });

    return completed;
  }

  async cancel(id: string, actorId: string): Promise<CareTask> {
    const task = await this.careTaskRepository.findById(id);

    if (!task) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    if (!canCancelCareTask(task.status)) {
      throw new ResourceConflictException(
        'Only pending care tasks can be cancelled.',
        'CARE_TASK_NOT_PENDING',
      );
    }

    const cancelled = await this.careTaskRepository.cancel(id);

    if (!cancelled) {
      throw new ResourceNotFoundException('CareTask', id);
    }

    await this.auditLogsService.record({
      actorUserId: actorId,
      action: AuditAction.CARE_TASK_CANCEL,
      resourceType: AuditResourceType.CARE_TASK,
      resourceId: id,
      metadata: {
        animalId: cancelled.animalId,
      },
    });

    return cancelled;
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return value.trim() || null;
}