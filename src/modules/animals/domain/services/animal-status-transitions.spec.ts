import { AnimalStatus } from '../enums/animal-status.enum';
import {
  canTransitionStatus,
  getAllowedStatusTransitions,
  ALLOWED_STATUS_TRANSITIONS,
} from './animal-status-transitions';

describe('animal-status-transitions', () => {
  describe('ALLOWED_STATUS_TRANSITIONS', () => {
    it('defines transitions for every status', () => {
      const allStatuses = Object.values(AnimalStatus);

      for (const status of allStatuses) {
        expect(ALLOWED_STATUS_TRANSITIONS).toHaveProperty(status);
      }
    });

    it('makes adopted and deceased terminal', () => {
      expect(ALLOWED_STATUS_TRANSITIONS[AnimalStatus.ADOPTED]).toEqual([]);
      expect(ALLOWED_STATUS_TRANSITIONS[AnimalStatus.DECEASED]).toEqual([]);
    });
  });

  describe('canTransitionStatus', () => {
    it('allows valid transitions from admitted', () => {
      expect(canTransitionStatus(AnimalStatus.ADMITTED, AnimalStatus.UNDER_TREATMENT)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.ADMITTED, AnimalStatus.AVAILABLE_FOR_ADOPTION)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.ADMITTED, AnimalStatus.DECEASED)).toBe(true);
    });

    it('allows valid transitions from under_treatment', () => {
      expect(canTransitionStatus(AnimalStatus.UNDER_TREATMENT, AnimalStatus.ADMITTED)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.UNDER_TREATMENT, AnimalStatus.AVAILABLE_FOR_ADOPTION)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.UNDER_TREATMENT, AnimalStatus.DECEASED)).toBe(true);
    });

    it('allows valid transitions from available_for_adoption', () => {
      expect(canTransitionStatus(AnimalStatus.AVAILABLE_FOR_ADOPTION, AnimalStatus.UNDER_TREATMENT)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.AVAILABLE_FOR_ADOPTION, AnimalStatus.ADOPTED)).toBe(true);
      expect(canTransitionStatus(AnimalStatus.AVAILABLE_FOR_ADOPTION, AnimalStatus.DECEASED)).toBe(true);
    });

    it('rejects transitions from adopted', () => {
      expect(canTransitionStatus(AnimalStatus.ADOPTED, AnimalStatus.ADMITTED)).toBe(false);
      expect(canTransitionStatus(AnimalStatus.ADOPTED, AnimalStatus.AVAILABLE_FOR_ADOPTION)).toBe(false);
      expect(canTransitionStatus(AnimalStatus.ADOPTED, AnimalStatus.DECEASED)).toBe(false);
    });

    it('rejects transitions from deceased', () => {
      expect(canTransitionStatus(AnimalStatus.DECEASED, AnimalStatus.ADMITTED)).toBe(false);
      expect(canTransitionStatus(AnimalStatus.DECEASED, AnimalStatus.UNDER_TREATMENT)).toBe(false);
      expect(canTransitionStatus(AnimalStatus.DECEASED, AnimalStatus.AVAILABLE_FOR_ADOPTION)).toBe(false);
    });

    it('rejects same-status transitions', () => {
      const allStatuses = Object.values(AnimalStatus);

      for (const status of allStatuses) {
        expect(canTransitionStatus(status, status)).toBe(false);
      }
    });

    it('rejects invalid transitions like admitted to adopted', () => {
      expect(canTransitionStatus(AnimalStatus.ADMITTED, AnimalStatus.ADOPTED)).toBe(false);
    });

    it('rejects invalid transitions like under_treatment to adopted', () => {
      expect(canTransitionStatus(AnimalStatus.UNDER_TREATMENT, AnimalStatus.ADOPTED)).toBe(false);
    });
  });

  describe('getAllowedStatusTransitions', () => {
    it('returns the allowed targets for each status', () => {
      expect(getAllowedStatusTransitions(AnimalStatus.ADMITTED)).toEqual([
        AnimalStatus.UNDER_TREATMENT,
        AnimalStatus.AVAILABLE_FOR_ADOPTION,
        AnimalStatus.DECEASED,
      ]);
      expect(getAllowedStatusTransitions(AnimalStatus.ADOPTED)).toEqual([]);
    });
  });
});
