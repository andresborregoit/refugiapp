import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { NotificationKind } from '../enums/notification-kind.enum';
import { NotificationDelivery } from '../entities/notification-delivery.entity';

export interface CreateDeliveryInput {
  dedupKey: string;
  userId: string;
  careTaskId: string;
  kind: NotificationKind;
  dueAtSnapshot: Date | null;
}

export interface DeliveryListQuery {
  page: number;
  limit: number;
  careTaskId?: string;
  status?: NotificationDeliveryStatus;
}

export interface PaginatedDeliveries {
  items: NotificationDelivery[];
  page: number;
  limit: number;
  total: number;
}

export const NOTIFICATION_DELIVERY_REPOSITORY = Symbol('NOTIFICATION_DELIVERY_REPOSITORY');

export interface NotificationDeliveryRepository {
  insertIfNotExists(
    input: CreateDeliveryInput,
  ): Promise<{ delivery: NotificationDelivery; inserted: boolean }>;
  findMany(query: DeliveryListQuery): Promise<PaginatedDeliveries>;
  markSent(id: string, receiptId: string | null): Promise<void>;
  markFailed(id: string, errorCode: string): Promise<void>;
  markSkipped(id: string): Promise<void>;
}
