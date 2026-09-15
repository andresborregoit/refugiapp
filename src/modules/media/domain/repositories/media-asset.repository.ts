import { MediaAsset } from '../entities/media-asset.entity';

export const MEDIA_ASSET_REPOSITORY = Symbol('MEDIA_ASSET_REPOSITORY');

export interface MediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
}
