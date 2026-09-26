import { DEFAULT_USER_POLICY } from '../constants/default-user-policy.constant';
import type { GiftistryUserPolicy } from '../interfaces/giftistry-user-policy.interface';

export function mergeUserPolicy(raw: unknown): GiftistryUserPolicy {
  const base = { ...DEFAULT_USER_POLICY };
  if (!raw || typeof raw !== 'object') {
    return base;
  }
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
