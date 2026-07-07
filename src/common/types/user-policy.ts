export interface GiftistryUserPolicy {
  canCreateWishlists: boolean;
  maxActiveWishlists: number;
  canUseComments: boolean;
  canUseAiFeatures: boolean;
  canSharePublicLinks: boolean;
  canUploadImages: boolean;
  canSendFriendRequests: boolean;
  canUseCustomThemes: boolean;
}

export type RegistrationMode = 'open' | 'invite_only' | 'disabled';

export interface SitePolicy {
  registrationMode: RegistrationMode;
  requireEmailVerification: boolean;
  loginAttemptsBeforeLockout: number;
  lockoutDurationMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowPasswordLogin: boolean;
  allowedEmailDomains: string[];
  defaultUserPolicy: GiftistryUserPolicy;
}

export const DEFAULT_USER_POLICY: GiftistryUserPolicy = {
  canCreateWishlists: true,
  maxActiveWishlists: 0,
  canUseComments: true,
  canUseAiFeatures: true,
  canSharePublicLinks: true,
  canUploadImages: true,
  canSendFriendRequests: true,
  canUseCustomThemes: true,
};

export const DEFAULT_SITE_POLICY: SitePolicy = {
  registrationMode: 'open',
  requireEmailVerification: false,
  loginAttemptsBeforeLockout: 5,
  lockoutDurationMinutes: 0,
  maintenanceMode: false,
  maintenanceMessage: 'Giftistry is undergoing maintenance. Please check back soon.',
  allowPasswordLogin: true,
  allowedEmailDomains: [],
  defaultUserPolicy: { ...DEFAULT_USER_POLICY },
};

export function mergeUserPolicy(raw: unknown): GiftistryUserPolicy {
  const base = { ...DEFAULT_USER_POLICY };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<GiftistryUserPolicy>;
  return {
    canCreateWishlists: obj.canCreateWishlists ?? base.canCreateWishlists,
    maxActiveWishlists: obj.maxActiveWishlists ?? base.maxActiveWishlists,
    canUseComments: obj.canUseComments ?? base.canUseComments,
    canUseAiFeatures: obj.canUseAiFeatures ?? base.canUseAiFeatures,
    canSharePublicLinks: obj.canSharePublicLinks ?? base.canSharePublicLinks,
    canUploadImages: obj.canUploadImages ?? base.canUploadImages,
    canSendFriendRequests: obj.canSendFriendRequests ?? base.canSendFriendRequests,
    canUseCustomThemes: obj.canUseCustomThemes ?? base.canUseCustomThemes,
  };
}

export function mergeSitePolicy(raw: unknown): SitePolicy {
  const base = { ...DEFAULT_SITE_POLICY, defaultUserPolicy: { ...DEFAULT_USER_POLICY } };
  if (!raw || typeof raw !== 'object') return base;
  const obj = raw as Partial<SitePolicy>;
  return {
    registrationMode: obj.registrationMode ?? base.registrationMode,
    requireEmailVerification: obj.requireEmailVerification ?? base.requireEmailVerification,
    loginAttemptsBeforeLockout: obj.loginAttemptsBeforeLockout ?? base.loginAttemptsBeforeLockout,
    lockoutDurationMinutes: obj.lockoutDurationMinutes ?? base.lockoutDurationMinutes,
    maintenanceMode: obj.maintenanceMode ?? base.maintenanceMode,
    maintenanceMessage: obj.maintenanceMessage ?? base.maintenanceMessage,
    allowPasswordLogin: obj.allowPasswordLogin ?? base.allowPasswordLogin,
    allowedEmailDomains: Array.isArray(obj.allowedEmailDomains) ? obj.allowedEmailDomains : base.allowedEmailDomains,
    defaultUserPolicy: mergeUserPolicy(obj.defaultUserPolicy),
  };
}
