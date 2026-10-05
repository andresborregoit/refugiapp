import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { AuditLogsService } from '../../../audit-logs/application/services/audit-logs.service';
import { AuditAction } from '../../../audit-logs/domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../audit-logs/domain/enums/audit-resource-type.enum';
import { CareTaskStatus } from '../../../care-tasks/domain/enums/care-task-status.enum';
import { CareTaskOrmEntity } from '../../../care-tasks/infrastructure/persistence/typeorm/entities/care-task.orm-entity';
import { UserOrmEntity } from '../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';
import { NotificationDeliveryStatus } from '../../domain/enums/notification-delivery-status.enum';
import { NotificationKind } from '../../domain/enums/notification-kind.enum';
import {
  DEVICE_SUBSCRIPTION_REPOSITORY,
  DeviceSubscriptionRepository,
} from '../../domain/repositories/device-subscription.repository';
import {
  NOTIFICATION_DELIVERY_REPOSITORY,
  NotificationDeliveryRepository,
} from '../../domain/repositories/notification-delivery.repository';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  NotificationPreferenceRepository,
} from '../../domain/repositories/notification-preference.repository';
import { buildDedupKey, toDueDateBucket } from '../../domain/services/notification-dedup-key';
import {
  classifyDueTask,
  isWithinQuietHours,
} from '../../domain/services/notification-selection-rules';
import { PUSH_PROVIDER, PushProvider } from '../../infrastructure/push/push-provider.interface';
import {
  DEFAULT_NOTIFICATION_TIMEZONE,
  DEFAULT_UPCOMING_WINDOW_MINUTES,
} from './notification-preferences.service';

export interface DispatchOptions {
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface DispatchResult {
  dryRun: boolean;
  scanned: number;
  queued: number;
  sent: number;
  skipped: number;
  failed: number;
  duplicates: number;
  invalidTokens: number;
}

interface Candidate {
  taskId: string;
  title: string;
  animalId: string;
  dueAt: Date | null;
  kind: NotificationKind;
}

/**
 * Idempotent dispatcher: selection + dedup-key insert + provider send.
 * Safe under retries and concurrent runs via the UNIQUE(dedupKey) outbox.
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new JsonLoggerService(NotificationDispatchService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(DEVICE_SUBSCRIPTION_REPOSITORY)
    private readonly devices: DeviceSubscriptionRepository,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferences: NotificationPreferenceRepository,
    @Inject(NOTIFICATION_DELIVERY_REPOSITORY)
    private readonly deliveries: NotificationDeliveryRepository,
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: PushProvider,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async dispatch(options: DispatchOptions = {}): Promise<DispatchResult> {
    const now = options.now ?? new Date();
    const limit = options.limit ?? this.configService.get<number>('push.dispatchLimit', 200);
    const dryRun = options.dryRun ?? this.configService.get<boolean>('push.dryRun', false);
    const defaultWindow = this.configService.get<number>(
      'push.upcomingWindowMinutes',
      DEFAULT_UPCOMING_WINDOW_MINUTES,
    );

    const tasks = await this.findCandidateTasks(limit, now, defaultWindow);
    const result: DispatchResult = {
      dryRun,
      scanned: tasks.length,
      queued: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
      invalidTokens: 0,
    };

    if (tasks.length === 0) {
      await this.auditDispatch(result);
      return result;
    }

    const recipients = await this.findRecipients();

    for (const task of tasks) {
      for (const recipient of recipients) {
        const preference =
          (await this.preferences.findByUserId(recipient.id)) ??
          ({
            userId: recipient.id,
            overdueEnabled: true,
            upcomingEnabled: true,
            upcomingWindowMinutes: defaultWindow,
            quietStart: null,
            quietEnd: null,
            timezone: DEFAULT_NOTIFICATION_TIMEZONE,
            updatedAt: now,
          } as never);

        const typedPreference = preference as {
          overdueEnabled: boolean;
          upcomingEnabled: boolean;
          upcomingWindowMinutes: number;
          quietStart: string | null;
          quietEnd: string | null;
          timezone: string;
        };

        if (task.kind === NotificationKind.OVERDUE && !typedPreference.overdueEnabled) {
          result.skipped += 1;
          continue;
        }

        if (task.kind === NotificationKind.UPCOMING && !typedPreference.upcomingEnabled) {
          result.skipped += 1;
          continue;
        }

        if (
          isWithinQuietHours(
            now,
            typedPreference.timezone,
            typedPreference.quietStart,
            typedPreference.quietEnd,
          )
        ) {
          result.skipped += 1;
          continue;
        }

        const dedupKey = buildDedupKey({
          kind: task.kind,
          careTaskId: task.taskId,
          dueAt: task.dueAt,
          userId: recipient.id,
          timeZone: typedPreference.timezone,
        });

        const { delivery, inserted } = await this.deliveries.insertIfNotExists({
          dedupKey,
          userId: recipient.id,
          careTaskId: task.taskId,
          kind: task.kind,
          dueAtSnapshot: task.dueAt,
        });

        if (!inserted) {
          result.duplicates += 1;
          continue;
        }

        result.queued += 1;

        if (dryRun) {
          await this.deliveries.markSkipped(delivery.id);
          result.skipped += 1;
          continue;
        }

        const tokens = await this.devices.findActiveTokensByUserId(recipient.id);

        if (tokens.length === 0) {
          await this.deliveries.markSkipped(delivery.id);
          result.skipped += 1;
          continue;
        }

        const title =
          task.kind === NotificationKind.OVERDUE ? 'Overdue care task' : 'Care task due soon';
        const dueLabel = task.dueAt
          ? `Due ${toDueDateBucket(task.dueAt, typedPreference.timezone)}`
          : 'No due date';
        const sendResults = await this.pushProvider.sendBatch(
          tokens.map((token) => ({
            to: token.expoPushToken,
            title,
            body: `${task.title} — ${dueLabel}`,
            data: { careTaskId: task.taskId, kind: task.kind, dedupKey },
          })),
        );

        let sentAny = false;
        const invalidHashes: string[] = [];
        for (let index = 0; index < sendResults.length; index += 1) {
          const sendResult = sendResults[index];

          if (sendResult.status === 'ok') {
            sentAny = true;
          } else if (sendResult.status === 'invalid_token') {
            result.invalidTokens += 1;
            invalidHashes.push(tokens[index].tokenHash);
          }
        }

        if (invalidHashes.length > 0) {
          await this.handleInvalidTokens(recipient.id, invalidHashes);
        }

        if (sentAny) {
          const receipt = sendResults.find((r) => r.receiptId)?.receiptId ?? null;
          await this.deliveries.markSent(delivery.id, receipt);
          result.sent += 1;
        } else if (invalidHashes.length > 0) {
          await this.deliveries.markFailed(delivery.id, 'EXPO_DEVICE_NOT_REGISTERED');
          result.failed += 1;
        } else {
          await this.deliveries.markFailed(
            delivery.id,
            sendResults[0]?.errorCode ?? 'PUSH_SEND_FAILED',
          );
          result.failed += 1;
        }
      }
    }

    this.logger.log(
      {
        event: 'push.dispatch.result',
        dryRun: result.dryRun,
        scanned: result.scanned,
        queued: result.queued,
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
        duplicates: result.duplicates,
        invalidTokens: result.invalidTokens,
      },
      NotificationDispatchService.name,
    );

    await this.auditDispatch(result);

    return result;
  }

  private async findCandidateTasks(
    limit: number,
    now: Date,
    defaultWindow: number,
  ): Promise<Candidate[]> {
    const entities = await this.dataSource
      .getRepository(CareTaskOrmEntity)
      .createQueryBuilder('task')
      .where('task.deletedAt IS NULL')
      .andWhere('task.status = :status', { status: CareTaskStatus.PENDING })
      .andWhere('task.dueAt IS NOT NULL')
      .andWhere('task.dueAt <= :horizon', {
        horizon: new Date(now.getTime() + defaultWindow * 60 * 1000),
      })
      .orderBy('task.dueAt', 'ASC')
      .addOrderBy('task.id', 'ASC')
      .limit(limit)
      .getMany();

    const candidates: Candidate[] = [];

    for (const entity of entities) {
      const kind = classifyDueTask(
        {
          status: entity.status,
          dueAt: entity.dueAt ?? null,
          upcomingWindowMinutes: defaultWindow,
        },
        now,
      );

      if (kind) {
        candidates.push({
          taskId: entity.id,
          title: entity.title,
          animalId: entity.animalId,
          dueAt: entity.dueAt ?? null,
          kind,
        });
      }
    }

    return candidates;
  }

  private async findRecipients(): Promise<{ id: string }[]> {
    const users = await this.dataSource
      .getRepository(UserOrmEntity)
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.deletedAt IS NULL')
      .andWhere('user.isActive = :active', { active: true })
      .andWhere(`(user.roles @> ARRAY[:admin]::text[] OR user.roles @> ARRAY[:manager]::text[])`, {
        admin: UserRole.ADMIN,
        manager: UserRole.SHELTER_MANAGER,
      })
      .getRawMany<{ id: string }>();

    return users;
  }

  private async handleInvalidTokens(userId: string, tokenHashes: string[]): Promise<void> {
    for (const tokenHash of tokenHashes) {
      await this.devices.deactivateByTokenHash(tokenHash);
    }

    await this.auditLogsService.record({
      actorUserId: null,
      action: AuditAction.PUSH_TOKEN_INVALID,
      resourceType: AuditResourceType.NOTIFICATION,
      resourceId: userId,
      metadata: { userId },
    });
  }

  private async auditDispatch(result: DispatchResult): Promise<void> {
    await this.auditLogsService.record({
      actorUserId: null,
      action: AuditAction.PUSH_DISPATCH_COMPLETED,
      resourceType: AuditResourceType.NOTIFICATION,
      resourceId: null,
      metadata: {
        scanned: result.scanned,
        queued: result.queued,
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
        duplicates: result.duplicates,
        dryRun: result.dryRun,
      },
    });
  }
}

export { NotificationDeliveryStatus };
