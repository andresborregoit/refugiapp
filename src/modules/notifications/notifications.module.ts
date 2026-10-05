import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DeviceSubscriptionsService } from './application/services/device-subscriptions.service';
import { NotificationDispatchService } from './application/services/notification-dispatch.service';
import { NotificationPreferencesService } from './application/services/notification-preferences.service';
import { DEVICE_SUBSCRIPTION_REPOSITORY } from './domain/repositories/device-subscription.repository';
import { NOTIFICATION_DELIVERY_REPOSITORY } from './domain/repositories/notification-delivery.repository';
import { NOTIFICATION_PREFERENCE_REPOSITORY } from './domain/repositories/notification-preference.repository';
import { DeviceSubscriptionOrmEntity } from './infrastructure/persistence/typeorm/entities/device-subscription.orm-entity';
import { NotificationDeliveryOrmEntity } from './infrastructure/persistence/typeorm/entities/notification-delivery.orm-entity';
import { NotificationPreferenceOrmEntity } from './infrastructure/persistence/typeorm/entities/notification-preference.orm-entity';
import { TypeOrmDeviceSubscriptionRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-device-subscription.repository';
import { TypeOrmNotificationDeliveryRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-notification-delivery.repository';
import { TypeOrmNotificationPreferenceRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-notification-preference.repository';
import { ExpoPushAdapter } from './infrastructure/push/expo-push.adapter';
import { NoopPushAdapter } from './infrastructure/push/fake-push.adapter';
import { PUSH_PROVIDER } from './infrastructure/push/push-provider.interface';
import { DeviceSubscriptionsController } from './interfaces/controllers/device-subscriptions.controller';
import { NotificationDeliveriesController } from './interfaces/controllers/notification-deliveries.controller';
import { NotificationPreferencesController } from './interfaces/controllers/notification-preferences.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceSubscriptionOrmEntity,
      NotificationPreferenceOrmEntity,
      NotificationDeliveryOrmEntity,
    ]),
    AuditLogsModule,
  ],
  controllers: [
    DeviceSubscriptionsController,
    NotificationPreferencesController,
    NotificationDeliveriesController,
  ],
  providers: [
    DeviceSubscriptionsService,
    NotificationPreferencesService,
    NotificationDispatchService,
    ExpoPushAdapter,
    NoopPushAdapter,
    {
      provide: DEVICE_SUBSCRIPTION_REPOSITORY,
      useClass: TypeOrmDeviceSubscriptionRepository,
    },
    {
      provide: NOTIFICATION_PREFERENCE_REPOSITORY,
      useClass: TypeOrmNotificationPreferenceRepository,
    },
    {
      provide: NOTIFICATION_DELIVERY_REPOSITORY,
      useClass: TypeOrmNotificationDeliveryRepository,
    },
    {
      provide: PUSH_PROVIDER,
      inject: [ConfigService, ExpoPushAdapter, NoopPushAdapter],
      useFactory: (config: ConfigService, expo: ExpoPushAdapter, noop: NoopPushAdapter) =>
        config.get<string>('push.provider', 'noop') === 'expo' ? expo : noop,
    },
  ],
  exports: [
    DeviceSubscriptionsService,
    NotificationPreferencesService,
    NotificationDispatchService,
  ],
})
export class NotificationsModule {}
