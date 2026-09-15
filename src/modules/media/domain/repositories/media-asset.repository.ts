import { MediaAsset } from '../entities/media-asset.entity';
import { MediaOwnerType } from '../enums/media-owner-type.enum';

export const MEDIA_ASSET_REPOSITORY = Symbol('MEDIA_ASSET_REPOSITORY');

export interface MediaAssetListQuery {
  ownerType: MediaOwnerType;
  ownerId: string;
  page: number;
  limit: number;
}

export interface PaginatedMediaAssets {
  items: MediaAsset[];
  page: number;
  limit: number;
  total: number;
}

export interface MediaAssetRepository {
  findById(id: string): Promise<MediaAsset | null>;
  findByOwner(query: MediaAssetListQuery): Promise<PaginatedMediaAssets>;
  create(asset: MediaAsset): Promise<MediaAsset>;
  softDeleteById(id: string): Promise<void>;
  existsByPublicId(publicId: string): Promise<boolean>;
}