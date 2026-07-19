export interface GiftistryUserPolicy {
  CanCreateWishlists: boolean;
  MaxActiveWishlists: number;
  CanUseComments: boolean;
  CanUseAiFeatures: boolean;
  CanSharePublicLinks: boolean;
  CanUploadImages: boolean;
  CanSendFriendRequests: boolean;
  CanUseCustomThemes: boolean;
}

export type RegistrationMode = 'open' | 'invite_only' | 'disabled';

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
  DefaultUserPolicy: GiftistryUserPolicy;
}

export const DEFAULT_USER_POLICY: GiftistryUserPolicy = {
  CanCreateWishlists: true,
  MaxActiveWishlists: 0,
  CanUseComments: true,
  CanUseAiFeatures: true,
  CanSharePublicLinks: true,
  CanUploadImages: true,
  CanSendFriendRequests: true,
  CanUseCustomThemes: true,
};

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
  DefaultUserPolicy: { ...DEFAULT_USER_POLICY },
};

export function mergeUserPolicy(raw: unknown): GiftistryUserPolicy {
  const base = { ...DEFAULT_USER_POLICY };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<GiftistryUserPolicy>;
  return {
    CanCreateWishlists: obj.CanCreateWishlists ?? base.CanCreateWishlists,
    MaxActiveWishlists: obj.MaxActiveWishlists ?? base.MaxActiveWishlists,
    CanUseComments: obj.CanUseComments ?? base.CanUseComments,
    CanUseAiFeatures: obj.CanUseAiFeatures ?? base.CanUseAiFeatures,
    CanSharePublicLinks: obj.CanSharePublicLinks ?? base.CanSharePublicLinks,
    CanUploadImages: obj.CanUploadImages ?? base.CanUploadImages,
    CanSendFriendRequests: obj.CanSendFriendRequests ?? base.CanSendFriendRequests,
    CanUseCustomThemes: obj.CanUseCustomThemes ?? base.CanUseCustomThemes,
  };
}

export function mergeSitePolicy(raw: unknown): SitePolicy {
  const base = { ...DEFAULT_SITE_POLICY, DefaultUserPolicy: { ...DEFAULT_USER_POLICY } };
  if (!raw || typeof raw !== 'object') return base;
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
    DefaultUserPolicy: mergeUserPolicy(obj.DefaultUserPolicy ?? base.DefaultUserPolicy),
  };
}
