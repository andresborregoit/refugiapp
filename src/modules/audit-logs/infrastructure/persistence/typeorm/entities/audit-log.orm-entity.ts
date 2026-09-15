import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { AuditAction } from '../../../../domain/enums/audit-action.enum';
import { AuditResourceType } from '../../../../domain/enums/audit-resource-type.enum';
import { UserOrmEntity } from '../../../../../users/infrastructure/persistence/typeorm/entities/user.orm-entity';

@Entity({ name: 'audit_logs' })
@Index(['resourceType', 'resourceId'])
@Index(['actorUserId'])
@Index(['occurredAt'])
@Index(['action'])
export class AuditLogOrmEntity extends BaseOrmEntity {
  @Column({ type: 'uuid', nullable: true })
  actorUserId?: string | null;

  @ManyToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser?: UserOrmEntity | null;

  @Column({
    type: 'enum',
    enum: AuditAction,
    enumName: 'audit_action',
  })
  action!: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResourceType,
    enumName: 'audit_resource_type',
  })
  resourceType!: AuditResourceType;

  @Column({ type: 'uuid', nullable: true })
  resourceId?: string | null;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}