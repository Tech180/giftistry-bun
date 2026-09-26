import type { SitePolicy } from '../interfaces/site-policy.interface';
import { DEFAULT_USER_POLICY } from './default-user-policy.constant';

export const DEFAULT_SITE_POLICY: SitePolicy = {
  RegistrationMode: 'invite_only',
  RequireEmailVerification: false,
  LoginAttemptsBeforeLockout: 5,
  LockoutDurationMinutes: 0,
  MaintenanceMode: false,
  MaintenanceMessage: 'Giftistry is undergoing maintenance. Please check back soon.',
  AllowPasswordLogin: true,
  RequireStrongPasswords: true,
  AllowedEmailDomains: [],
  RegistrationInviteTtlHours: 168,
  RegistrationInviteMaxUses: 1,
  DefaultUserPolicy: { ...DEFAULT_USER_POLICY },
};
