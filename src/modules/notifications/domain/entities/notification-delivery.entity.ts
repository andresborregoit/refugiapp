import { NotificationDeliveryStatus } from '../enums/notification-delivery-status.enum';
import { NotificationKind } from '../enums/notification-kind.enum';

export class NotificationDelivery {
  constructor(
    public readonly id: string,
    public readonly dedupKey: string,
    public readonly userId: string,
    public readonly careTaskId: string,
    public readonly kind: NotificationKind,
    public readonly dueAtSnapshot: Date | null,
    public readonly status: NotificationDeliveryStatus,
    public readonly providerReceiptId: string | null,
    public readonly attemptCount: number,
    public readonly lastErrorCode: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
