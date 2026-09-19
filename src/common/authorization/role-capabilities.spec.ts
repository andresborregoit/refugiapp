import { UserRole } from '../enums/user-role.enum';
import {
  CAPABILITIES,
  Capability,
  ROLE_CAPABILITIES,
  capabilitiesForRole,
  hasCapability,
} from './role-capabilities';

describe('role capabilities', () => {
  it('declares the frozen capability set', () => {
    expect(CAPABILITIES).toEqual([
      'canEditAnimal',
      'canReadClinicalRecords',
      'canManageUsers',
      'canManageExpenses',
      'canManageVets',
      'canReadAudit',
    ]);
  });

  it('covers every role and every capability without missing entries', () => {
    for (const role of Object.values(UserRole)) {
      const capabilities = ROLE_CAPABILITIES[role];
      expect(capabilities).toBeDefined();

      for (const capability of CAPABILITIES) {
        expect(typeof capabilities[capability]).toBe('boolean');
      }
    }
  });

  it('keeps only the declared capabilities in every role row', () => {
    for (const role of Object.values(UserRole)) {
      expect(Object.keys(ROLE_CAPABILITIES[role]).sort()).toEqual([...CAPABILITIES].sort());
    }
  });

  it('assigns admin full access', () => {
    expect(ROLE_CAPABILITIES[UserRole.ADMIN]).toEqual({
      canEditAnimal: true,
      canReadClinicalRecords: true,
      canManageUsers: true,
      canManageExpenses: true,
      canManageVets: true,
      canReadAudit: true,
    });
  });

  it('assigns shelter_manager operational management without clinical or admin access', () => {
    expect(ROLE_CAPABILITIES[UserRole.SHELTER_MANAGER]).toEqual({
      canEditAnimal: true,
      canReadClinicalRecords: false,
      canManageUsers: false,
      canManageExpenses: true,
      canManageVets: true,
      canReadAudit: false,
    });
  });

  it('assigns veterinarian clinical access without operational or admin access', () => {
    expect(ROLE_CAPABILITIES[UserRole.VETERINARIAN]).toEqual({
      canEditAnimal: false,
      canReadClinicalRecords: true,
      canManageUsers: false,
      canManageExpenses: false,
      canManageVets: false,
      canReadAudit: false,
    });
  });

  it('returns the capabilities of a role via capabilitiesForRole', () => {
    expect(capabilitiesForRole(UserRole.ADMIN)).toEqual(ROLE_CAPABILITIES[UserRole.ADMIN]);
  });

  it('answers hasCapability consistently with the matrix', () => {
    const cases: Array<[UserRole, Capability, boolean]> = [
      [UserRole.ADMIN, 'canReadAudit', true],
      [UserRole.SHELTER_MANAGER, 'canReadClinicalRecords', false],
      [UserRole.VETERINARIAN, 'canEditAnimal', false],
      [UserRole.VETERINARIAN, 'canReadClinicalRecords', true],
      [UserRole.SHELTER_MANAGER, 'canManageExpenses', true],
      [UserRole.SHELTER_MANAGER, 'canManageUsers', false],
    ];

    for (const [role, capability, expected] of cases) {
      expect(hasCapability(role, capability)).toBe(expected);
    }
  });
});