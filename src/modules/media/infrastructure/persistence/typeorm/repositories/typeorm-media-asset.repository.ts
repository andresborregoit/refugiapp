import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaAsset } from '../../../../domain/entities/media-asset.entity';
import { MediaAssetRepository } from '../../../../domain/repositories/media-asset.repository';
import { MediaAssetOrmEntity } from '../entities/media-asset.orm-entity';

@Injectable()
export class TypeOrmMediaAssetRepository implements MediaAssetRepository {
  constructor(
    @InjectRepository(MediaAssetOrmEntity)
    private readonly repository: Repository<MediaAssetOrmEntity>,
  ) {}

  async findById(id: string): Promise<MediaAsset | null> {
    const entity = await this.repository.findOne({ where: { id } });

    return entity ? this.toDomain(entity) : null;
  }

  async create(asset: MediaAsset): Promise<MediaAsset> {
    const ormEntity = this.repository.create({
      id: asset.id,
      ownerType: asset.ownerType,
      ownerId: asset.ownerId,
      resourceType: asset.resourceType,
      cloudinaryPublicId: asset.publicId,
      secureUrl: asset.secureUrl,
      bytes: asset.bytes,
      format: asset.format,
      uploadedByUserId: asset.uploadedByUserId,
      metadata: asset.metadata,
    });

    const saved = await this.repository.save(ormEntity);

    return this.toDomain(saved);
  }

  async deleteByPublicId(publicId: string): Promise<void> {
    await this.repository.delete({ cloudinaryPublicId: publicId });
  }

  async existsByPublicId(publicId: string): Promise<boolean> {
    const count = await this.repository.count({ where: { cloudinaryPublicId: publicId } });
    return count > 0;
  }

  private toDomain(entity: MediaAssetOrmEntity): MediaAsset {
    return new MediaAsset(
      entity.id,
      entity.ownerType,
      entity.ownerId,
      entity.resourceType,
      entity.cloudinaryPublicId,
      entity.secureUrl,
      entity.bytes ?? null,
      entity.format ?? null,
      entity.uploadedByUserId ?? null,
      entity.metadata,
    );
  }
}
