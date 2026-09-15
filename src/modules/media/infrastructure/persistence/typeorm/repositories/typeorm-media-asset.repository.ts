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

  private toDomain(entity: MediaAssetOrmEntity): MediaAsset {
    return new MediaAsset(
      entity.id,
      entity.ownerType,
      entity.ownerId,
      entity.resourceType,
      entity.cloudinaryPublicId,
      entity.secureUrl,
    );
  }
}
