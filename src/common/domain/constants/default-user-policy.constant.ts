import type { GiftistryUserPolicy } from '../interfaces/giftistry-user-policy.interface';

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
