import { MediaOwnerType } from '../enums/media-owner-type.enum';

export const OWNER_EXISTS_CHECKER = Symbol('OWNER_EXISTS_CHECKER');

export interface OwnerExistsChecker {
  exists(ownerType: MediaOwnerType, ownerId: string): Promise<boolean>;
}
