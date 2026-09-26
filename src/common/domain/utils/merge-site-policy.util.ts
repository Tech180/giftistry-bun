import { DEFAULT_SITE_POLICY } from '../constants/default-site-policy.constant';
import { DEFAULT_USER_POLICY } from '../constants/default-user-policy.constant';
import type { SitePolicy } from '../interfaces/site-policy.interface';
import { mergeUserPolicy } from './merge-user-policy.util';

export function mergeSitePolicy(raw: unknown): SitePolicy {
  const base = { ...DEFAULT_SITE_POLICY, DefaultUserPolicy: { ...DEFAULT_USER_POLICY } };
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  const obj = raw as Partial<SitePolicy>;
  return {
    RegistrationMode: obj.RegistrationMode ?? base.RegistrationMode,
    RequireEmailVerification: obj.RequireEmailVerification ?? base.RequireEmailVerification,
    LoginAttemptsBeforeLockout: obj.LoginAttemptsBeforeLockout ?? base.LoginAttemptsBeforeLockout,
    LockoutDurationMinutes: obj.LockoutDurationMinutes ?? base.LockoutDurationMinutes,
    MaintenanceMode: obj.MaintenanceMode ?? base.MaintenanceMode,
    MaintenanceMessage: obj.MaintenanceMessage ?? base.MaintenanceMessage,
    AllowPasswordLogin: obj.AllowPasswordLogin ?? base.AllowPasswordLogin,
    RequireStrongPasswords: obj.RequireStrongPasswords ?? base.RequireStrongPasswords,
    AllowedEmailDomains: Array.isArray(obj.AllowedEmailDomains)
      ? obj.AllowedEmailDomains
      : base.AllowedEmailDomains,
    RegistrationInviteTtlHours:
      typeof obj.RegistrationInviteTtlHours === 'number' &&
      Number.isFinite(obj.RegistrationInviteTtlHours) &&
      obj.RegistrationInviteTtlHours > 0
        ? Math.min(Math.floor(obj.RegistrationInviteTtlHours), 8760)
        : base.RegistrationInviteTtlHours,
    RegistrationInviteMaxUses:
      typeof obj.RegistrationInviteMaxUses === 'number' &&
      Number.isFinite(obj.RegistrationInviteMaxUses) &&
      obj.RegistrationInviteMaxUses > 0
        ? Math.floor(obj.RegistrationInviteMaxUses)
        : base.RegistrationInviteMaxUses,
    DefaultUserPolicy: mergeUserPolicy(obj.DefaultUserPolicy ?? base.DefaultUserPolicy),
  };
}
