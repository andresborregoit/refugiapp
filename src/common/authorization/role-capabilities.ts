import { UserRole } from '../enums/user-role.enum';

export const CAPABILITIES = [
  'canEditAnimal',
  'canReadClinicalRecords',
  'canManageUsers',
  'canManageExpenses',
  'canManageVets',
  'canReadAudit',
  'canManageAdoptions',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type RoleCapabilities = Record<Capability, boolean>;

export const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  [UserRole.ADMIN]: {
    canEditAnimal: true,
    canReadClinicalRecords: true,
    canManageUsers: true,
    canManageExpenses: true,
    canManageVets: true,
    canReadAudit: true,
    canManageAdoptions: true,
  },
  [UserRole.SHELTER_MANAGER]: {
    canEditAnimal: true,
    canReadClinicalRecords: false,
    canManageUsers: false,
    canManageExpenses: true,
    canManageVets: true,
    canReadAudit: false,
    canManageAdoptions: true,
  },
  [UserRole.VETERINARIAN]: {
    canEditAnimal: false,
    canReadClinicalRecords: true,
    canManageUsers: false,
    canManageExpenses: false,
    canManageVets: false,
    canReadAudit: false,
    canManageAdoptions: false,
  },
};

export function capabilitiesForRole(role: UserRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role];
}

export function hasCapability(role: UserRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role][capability];
}
