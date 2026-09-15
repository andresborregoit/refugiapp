import { getMetadataArgsStorage } from 'typeorm';
import { MediaAssetOrmEntity } from './media-asset.orm-entity';

describe('MediaAssetOrmEntity', () => {
  it('declares a non-negative bytes check constraint while allowing null', () => {
    const check = getMetadataArgsStorage().checks.find(
      ({ target, name }) =>
        target === MediaAssetOrmEntity &&
        name === 'CHK_media_assets_bytes_non_negative',
    );

    expect(check).toBeDefined();
    expect(check?.expression).toBe('"bytes" IS NULL OR "bytes" >= 0');
  });
});
