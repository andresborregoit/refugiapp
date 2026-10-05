import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../../../../domain/entities/notification-preference.entity';
import {
  NotificationPreferenceRepository,
  UpdatePreferencesInput,
} from '../../../../domain/repositories/notification-preference.repository';
import { NotificationPreferenceOrmEntity } from '../entities/notification-preference.orm-entity';

@Injectable()
export class TypeOrmNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(
    @InjectRepository(NotificationPreferenceOrmEntity)
    private readonly repository: Repository<NotificationPreferenceOrmEntity>,
  ) {}

  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const entity = await this.repository.findOne({ where: { userId } });

    return entity ? this.toDomain(entity) : null;
  }

  async upsert(userId: string, input: UpdatePreferencesInput): Promise<NotificationPreference> {
    const existing = await this.repository.findOne({ where: { userId } });

    if (existing) {
      existing.overdueEnabled = input.overdueEnabled;
      existing.upcomingEnabled = input.upcomingEnabled;
      existing.upcomingWindowMinutes = input.upcomingWindowMinutes;
      existing.quietStart = input.quietStart;
      existing.quietEnd = input.quietEnd;
      existing.timezone = input.timezone;
      existing.updatedAt = new Date();

      return this.toDomain(await this.repository.save(existing));
    }

    const created = await this.repository.save(
      this.repository.create({
        userId,
        overdueEnabled: input.overdueEnabled,
        upcomingEnabled: input.upcomingEnabled,
        upcomingWindowMinutes: input.upcomingWindowMinutes,
        quietStart: input.quietStart,
        quietEnd: input.quietEnd,
        timezone: input.timezone,
      }),
    );

    return this.toDomain(created);
  }

  private toDomain(entity: NotificationPreferenceOrmEntity): NotificationPreference {
    return new NotificationPreference(
      entity.userId,
      entity.overdueEnabled,
      entity.upcomingEnabled,
      entity.upcomingWindowMinutes,
      entity.quietStart ?? null,
      entity.quietEnd ?? null,
      entity.timezone,
      entity.updatedAt,
    );
  }
}
