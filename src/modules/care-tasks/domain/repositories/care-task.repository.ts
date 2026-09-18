import { CareTask } from '../entities/care-task.entity';
import { CreateCareTask } from '../entities/create-care-task.entity';
import { UpdateCareTask } from '../entities/update-care-task.entity';
import { CareTaskStatus } from '../enums/care-task-status.enum';

export const CARE_TASK_REPOSITORY = Symbol('CARE_TASK_REPOSITORY');

export interface CareTaskListQuery {
  page: number;
  limit: number;
  animalId?: string;
  status?: CareTaskStatus;
}

export interface PaginatedCareTasks {
  items: CareTask[];
  page: number;
  limit: number;
  total: number;
}

export interface CareTaskRepository {
  findById(id: string): Promise<CareTask | null>;
  findMany(query: CareTaskListQuery): Promise<PaginatedCareTasks>;
  create(input: CreateCareTask): Promise<CareTask>;
  update(id: string, input: UpdateCareTask): Promise<CareTask | null>;
  complete(id: string): Promise<CareTask | null>;
  cancel(id: string): Promise<CareTask | null>;
}