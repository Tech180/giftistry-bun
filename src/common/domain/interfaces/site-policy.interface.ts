import type { GiftistryUserPolicy } from './giftistry-user-policy.interface';
import type { RegistrationMode } from '../types/registration-mode.type';

export interface SitePolicy {
  RegistrationMode: RegistrationMode;
  RequireEmailVerification: boolean;
  LoginAttemptsBeforeLockout: number;
  LockoutDurationMinutes: number;
  MaintenanceMode: boolean;
  MaintenanceMessage: string;
  AllowPasswordLogin: boolean;
  RequireStrongPasswords: boolean;
  AllowedEmailDomains: string[];
  /** Hours until a regenerated registration invite expires. */
  RegistrationInviteTtlHours: number;
  /** Optional cap on successful signups per invite; null = unlimited until expiry. */
  RegistrationInviteMaxUses: number | null;
  DefaultUserPolicy: GiftistryUserPolicy;
}
