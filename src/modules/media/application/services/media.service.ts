import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticatedUser } from '../../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '../../../../common/enums/user-role.enum';
import { JsonLoggerService } from '../../../../common/logger/json-logger.service';
import { ResourceNotFoundException } from '../../../../common/exceptions/resource-not-found.exception';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaOwnerType } from '../../domain/enums/media-owner-type.enum';
import { MediaResourceType } from '../../domain/enums/media-resource-type.enum';
import {
  MEDIA_ASSET_REPOSITORY,
  MediaAssetListQuery,
  MediaAssetRepository,
  PaginatedMediaAssets,
} from '../../domain/repositories/media-asset.repository';
import { OWNER_EXISTS_CHECKER, OwnerExistsChecker } from '../../domain/repositories/owner-exists-checker';
import { CloudinaryStorageService } from '../../infrastructure/cloudinary/cloudinary-storage.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
] as const;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const DEFAULT_ORPHAN_PURGE_LIMIT = 500;

const MIN_ORPHAN_RETENTION_HOURS = 1;

export interface PurgeOrphanMediaOptions {
  olderThanHours: number;
  dryRun?: boolean;
  limit?: number;
}

export interface PurgeOrphanMediaResult {
  dryRun: boolean;
  threshold: Date;
  candidates: string[];
  deleted: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new JsonLoggerService(MediaService.name);

  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY)
    private readonly mediaAssetRepository: MediaAssetRepository,
    @Inject(OWNER_EXISTS_CHECKER)
    private readonly ownerExistsChecker: OwnerExistsChecker,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  async findById(id: string): Promise<MediaAsset | null> {
    return this.mediaAssetRepository.findById(id);
  }

  async upload(
    fileBuffer: Buffer,
    filename: string,
    mimetype: string,
    ownerType: MediaOwnerType | null,
    ownerId: string | null,
    user: AuthenticatedUser,
  ): Promise<MediaAsset> {
    if ((ownerType === null) !== (ownerId === null)) {
      throw new BadRequestException({
        code: 'INVALID_OWNER',
        message: 'ownerType and ownerId must be provided together or omitted.',
      });
    }

    if (ownerType !== null && ownerId !== null) {
      const ownerExists = await this.ownerExistsChecker.exists(ownerType, ownerId);

      if (!ownerExists) {
        throw new ResourceNotFoundException(ownerType, ownerId);
      }
    }

    this.assertCanUpload(user, ownerType);

    this.validateMimetype(mimetype);
    this.validateFileSize(fileBuffer.length);

    const folder = this.cloudinaryStorageService.buildUploadFolder(ownerType, ownerId);
    const resourceType = this.mapMimetypeToResourceType(mimetype);

    let cloudinaryResult;
    try {
      cloudinaryResult = await this.cloudinaryStorageService.upload(fileBuffer, {
        folder,
        resourceType,
        allowedFormats: this.getAllowedFormats(mimetype),
        maxFileSize: MAX_FILE_SIZE_BYTES,
      });
    } catch (error) {
      this.logger.error(`Cloudinary upload failed for ${ownerType ?? 'orphan'}/${ownerId}: ${error}`);
      throw error;
    }

    const asset = new MediaAsset(
      randomUUID(),
      ownerType,
      ownerId,
      resourceType,
      cloudinaryResult.publicId,
      cloudinaryResult.secureUrl,
      cloudinaryResult.bytes,
      cloudinaryResult.format,
      user.id,
      { originalFilename: filename, mimetype },
    );

    try {
      return await this.mediaAssetRepository.create(asset);
    } catch (error) {
      this.logger.error(
        `PostgreSQL persistence failed after Cloudinary upload. Compensating by deleting Cloudinary asset ${cloudinaryResult.publicId}.`,
      );
      try {
        await this.cloudinaryStorageService.delete(cloudinaryResult.publicId);
      } catch (compensationError) {
        this.logger.error(
          `Cloudinary compensation failed for asset ${cloudinaryResult.publicId}: ${compensationError}`,
        );
      }
      throw error;
    }
  }

  async listByOwner(query: MediaAssetListQuery): Promise<PaginatedMediaAssets> {
    const ownerExists = await this.ownerExistsChecker.exists(query.ownerType, query.ownerId);

    if (!ownerExists) {
      throw new ResourceNotFoundException(query.ownerType, query.ownerId);
    }

    return this.mediaAssetRepository.findByOwner(query);
  }

  async delete(id: string, user: AuthenticatedUser): Promise<void> {
    const asset = await this.mediaAssetRepository.findById(id);

    if (!asset) {
      throw new ResourceNotFoundException('MediaAsset', id);
    }

    this.assertCanDelete(user, asset);

    await this.mediaAssetRepository.softDeleteById(id);

    try {
      await this.cloudinaryStorageService.delete(asset.publicId);
    } catch (error) {
      this.logger.error(
        `Cloudinary cleanup failed for soft-deleted asset ${id} (${asset.publicId}): ${error}`,
      );
    }
  }

  buildUploadFolder(ownerType: MediaOwnerType | null, ownerId: string | null): string {
    return this.cloudinaryStorageService.buildUploadFolder(ownerType, ownerId);
  }

  async purgeExpiredOrphans(
    options: PurgeOrphanMediaOptions,
  ): Promise<PurgeOrphanMediaResult> {
    if (!Number.isFinite(options.olderThanHours) || options.olderThanHours < MIN_ORPHAN_RETENTION_HOURS) {
      throw new BadRequestException({
        code: 'INVALID_ORPHAN_RETENTION',
        message: 'olderThanHours must be a number of hours equal to or greater than 1.',
      });
    }

    if (options.limit !== undefined && (!Number.isFinite(options.limit) || options.limit < 1)) {
      throw new BadRequestException({
        code: 'INVALID_ORPHAN_PURGE_LIMIT',
        message: 'limit must be a positive integer.',
      });
    }

    const startedAt = Date.now();
    const dryRun = options.dryRun ?? false;
    const threshold = new Date(Date.now() - options.olderThanHours * 60 * 60 * 1000);
    const limit = options.limit ?? DEFAULT_ORPHAN_PURGE_LIMIT;
    const candidates = await this.mediaAssetRepository.findOrphanedOlderThan(threshold, limit);
    const candidateIds = candidates.map((asset) => asset.id);

    this.logger.log(
      {
        event: 'media.orphan_purge.started',
        dryRun,
        olderThanHours: options.olderThanHours,
        limit,
        threshold: threshold.toISOString(),
        candidates: candidateIds.length,
      },
      MediaService.name,
    );

    if (dryRun) {
      return {
        dryRun: true,
        threshold,
        candidates: candidateIds,
        deleted: 0,
        failed: 0,
        skipped: 0,
      };
    }

    let deleted = 0;
    let failed = 0;
    let skipped = 0;

    for (const asset of candidates) {
      try {
        const softDeleted = await this.mediaAssetRepository.softDeleteOrphanOlderThan(
          asset.id,
          threshold,
        );

        if (!softDeleted) {
          skipped += 1;
          this.logger.warn(
            {
              event: 'media.orphan_purge.skipped',
              assetId: asset.id,
              reason: 'asset_no_longer_orphan_or_already_deleted',
            },
            MediaService.name,
          );
          continue;
        }

        try {
          await this.cloudinaryStorageService.delete(asset.publicId);
        } catch (error) {
          this.logger.error(
            {
              event: 'media.orphan_purge.cloudinary_failed',
              assetId: asset.id,
              publicId: asset.publicId,
              error: error instanceof Error ? error.message : String(error),
            },
            MediaService.name,
          );
          failed += 1;
        }
        deleted += 1;
      } catch (error) {
        this.logger.error(
          {
            event: 'media.orphan_purge.failed',
            assetId: asset.id,
            error: error instanceof Error ? error.message : String(error),
          },
          MediaService.name,
        );
        failed += 1;
      }
    }

    const durationMs = Date.now() - startedAt;
    this.logger.log(
      {
        event: 'media.orphan_purge.completed',
        dryRun,
        threshold: threshold.toISOString(),
        candidates: candidateIds.length,
        deleted,
        failed,
        skipped,
        durationMs,
      },
      MediaService.name,
    );

    return {
      dryRun: false,
      threshold,
      candidates: candidateIds,
      deleted,
      failed,
      skipped,
    };
  }

  private assertCanUpload(
    user: AuthenticatedUser,
    ownerType: MediaOwnerType | null,
  ): void {
    if (this.isPrivileged(user)) {
      return;
    }

    if (ownerType !== null && ownerType !== MediaOwnerType.MEDICAL_RECORD) {
      throw new ForbiddenException(
        'Veterinarians can only upload clinical attachments.',
      );
    }
  }

  private assertCanDelete(user: AuthenticatedUser, asset: MediaAsset): void {
    if (this.isPrivileged(user)) {
      return;
    }

    if (asset.isOrphan() && asset.uploadedByUserId === user.id) {
      return;
    }

    if (asset.ownerType !== MediaOwnerType.MEDICAL_RECORD) {
      throw new ForbiddenException(
        'Veterinarians can only delete their own orphan assets or clinical attachments.',
      );
    }
  }

  private isPrivileged(user: AuthenticatedUser): boolean {
    return (
      user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SHELTER_MANAGER)
    );
  }

  private validateMimetype(mimetype: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      throw new BadRequestException(
        `Mimetype ${mimetype} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
  }

  private validateFileSize(sizeBytes: number): void {
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`,
      );
    }
  }

  private mapMimetypeToResourceType(mimetype: string): MediaResourceType {
    if (mimetype.startsWith('image/')) {
      return MediaResourceType.IMAGE;
    }
    if (mimetype.startsWith('video/')) {
      return MediaResourceType.VIDEO;
    }
    return MediaResourceType.RAW;
  }

  private getAllowedFormats(mimetype: string): string[] {
    switch (mimetype) {
      case 'image/jpeg':
        return ['jpg', 'jpeg'];
      case 'image/png':
        return ['png'];
      case 'image/webp':
        return ['webp'];
      case 'application/pdf':
        return ['pdf'];
      case 'video/mp4':
        return ['mp4'];
      default:
        return [];
    }
  }
}