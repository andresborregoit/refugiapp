import { CareTaskStatus } from '../enums/care-task-status.enum';

export function canCompleteCareTask(status: CareTaskStatus): boolean {
  return status === CareTaskStatus.PENDING;
}

export function canCancelCareTask(status: CareTaskStatus): boolean {
  return status === CareTaskStatus.PENDING;
}