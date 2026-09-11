import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { MediaService } from './application/services/media.service';
import { MEDIA_ASSET_REPOSITORY } from './domain/repositories/media-asset.repository';
import { OWNER_EXISTS_CHECKER } from './domain/repositories/owner-exists-checker';
import { CloudinaryProvider } from './infrastructure/cloudinary/cloudinary.provider';
import { CloudinaryStorageService } from './infrastructure/cloudinary/cloudinary-storage.service';
import { MediaAssetOrmEntity } from './infrastructure/persistence/typeorm/entities/media-asset.orm-entity';
import { TypeOrmMediaAssetRepository } from './infrastructure/persistence/typeorm/repositories/typeorm-media-asset.repository';
import { OwnerExistsCheckerImpl } from './infrastructure/persistence/owner-exists-checker.impl';
import { MediaController } from './interfaces/controllers/media.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaAssetOrmEntity]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [MediaController],
  providers: [
    CloudinaryProvider,
    CloudinaryStorageService,
    MediaService,
    {
      provide: MEDIA_ASSET_REPOSITORY,
      useClass: TypeOrmMediaAssetRepository,
    },
  ],
  exports: [MediaService, CloudinaryStorageService, MEDIA_ASSET_REPOSITORY],
})
export class MediaModule {}
