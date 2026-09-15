import { DomainException } from '../../../../common/exceptions/domain.exception';
import { MediaOwnerType } from '../enums/media-owner-type.enum';
import {
  assertCanLinkToContext,
  EXPECTED_OWNER_TYPES,
  MEDIA_ALREADY_OWNED,
  MEDIA_INCOMPATIBLE_OWNER_TYPE,
  MediaLinkingContext,
} from './media-owner-policy';

describe('media-owner-policy', () => {
  describe('assertCanLinkToContext', () => {
    it('allows linking an orphan asset to any context', () => {
      expect(() =>
        assertCanLinkToContext(null, MediaLinkingContext.EXPENSE_TICKET),
      ).not.toThrow();
      expect(() =>
        assertCanLinkToContext(null, MediaLinkingContext.ANIMAL_PROFILE_PHOTO),
      ).not.toThrow();
      expect(() =>
        assertCanLinkToContext(null, MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT),
      ).not.toThrow();
    });

    it.each([
      [MediaLinkingContext.ANIMAL_PROFILE_PHOTO, MediaOwnerType.ANIMAL],
      [MediaLinkingContext.EXPENSE_TICKET, MediaOwnerType.EXPENSE_TICKET],
      [MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT, MediaOwnerType.MEDICAL_RECORD],
    ])(
      'rejects an asset already owned when it is owned by the expected type for %s',
      (context, ownerType) => {
        try {
          assertCanLinkToContext(ownerType, context);
          fail('Expected DomainException to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(DomainException);
          expect((error as DomainException).code).toBe(MEDIA_ALREADY_OWNED);
        }
      },
    );

    it.each([
      [
        MediaLinkingContext.ANIMAL_PROFILE_PHOTO,
        MediaOwnerType.EXPENSE_TICKET,
        MediaOwnerType.USER,
        MediaOwnerType.VETERINARIAN,
        MediaOwnerType.MEDICAL_RECORD,
      ],
      [
        MediaLinkingContext.EXPENSE_TICKET,
        MediaOwnerType.ANIMAL,
        MediaOwnerType.USER,
        MediaOwnerType.VETERINARIAN,
        MediaOwnerType.MEDICAL_RECORD,
      ],
      [
        MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT,
        MediaOwnerType.ANIMAL,
        MediaOwnerType.EXPENSE_TICKET,
        MediaOwnerType.USER,
        MediaOwnerType.VETERINARIAN,
      ],
    ])(
      'rejects an incompatible owner type for %s',
      (context, ...incompatibleTypes) => {
        for (const ownerType of incompatibleTypes) {
          try {
            assertCanLinkToContext(ownerType, context);
            fail('Expected DomainException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(DomainException);
            expect((error as DomainException).code).toBe(MEDIA_INCOMPATIBLE_OWNER_TYPE);
          }
        }
      },
    );
  });

  describe('EXPECTED_OWNER_TYPES', () => {
    it('maps every context to exactly its owner type', () => {
      expect(EXPECTED_OWNER_TYPES[MediaLinkingContext.ANIMAL_PROFILE_PHOTO]).toEqual([
        MediaOwnerType.ANIMAL,
      ]);
      expect(EXPECTED_OWNER_TYPES[MediaLinkingContext.EXPENSE_TICKET]).toEqual([
        MediaOwnerType.EXPENSE_TICKET,
      ]);
      expect(EXPECTED_OWNER_TYPES[MediaLinkingContext.MEDICAL_RECORD_ATTACHMENT]).toEqual([
        MediaOwnerType.MEDICAL_RECORD,
      ]);
    });
  });
});