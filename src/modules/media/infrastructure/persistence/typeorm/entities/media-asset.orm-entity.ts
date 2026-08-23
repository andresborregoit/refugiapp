import { Column, Entity, Index } from 'typeorm';
import { BaseOrmEntity } from '../../../../../../common/entities/base-orm.entity';
import { MediaOwnerType } from '../../../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../../../domain/enums/media-resource-type.enum';

@Entity({ name: 'media_assets' })
@Index(['ownerType', 'ownerId'])
@Index(['cloudinaryPublicId'], { unique: true })
export class MediaAssetOrmEntity extends BaseOrmEntity {
  @Column({
    type: 'enum',
    enum: MediaOwnerType,
    enumName: 'media_owner_type',
  })
  ownerType!: MediaOwnerType;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({
    type: 'enum',
    enum: MediaResourceType,
    enumName: 'media_resource_type',
    default: MediaResourceType.IMAGE,
  })
  resourceType!: MediaResourceType;

  @Column({ type: 'varchar', length: 255 })
  cloudinaryPublicId!: string;

  @Column({ type: 'varchar', length: 2048 })
  secureUrl!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  format?: string | null;

  @Column({ type: 'integer', nullable: true })
  bytes?: number | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedByUserId?: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;
}
