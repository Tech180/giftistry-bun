import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';
import type { RegistrationMode } from '@/common/domain/types/registration-mode.type';

export interface SitePolicyRequest {
  RegistrationMode?: RegistrationMode;
  RequireEmailVerification?: boolean;
  LoginAttemptsBeforeLockout?: number;
  LockoutDurationMinutes?: number;
  MaintenanceMode?: boolean;
  MaintenanceMessage?: string;
  AllowPasswordLogin?: boolean;
  RequireStrongPasswords?: boolean;
  AllowedEmailDomains?: string[];
  RegistrationInviteTtlHours?: number;
  RegistrationInviteMaxUses?: number | null;
  DefaultUserPolicy?: Partial<GiftistryUserPolicy>;
}
