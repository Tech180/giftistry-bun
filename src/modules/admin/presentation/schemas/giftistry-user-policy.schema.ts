import { t } from 'elysia';

export const giftistryUserPolicySchema = t.Object({
  CanCreateWishlists: t.Optional(t.Boolean()),
  MaxActiveWishlists: t.Optional(t.Number()),
  CanUseComments: t.Optional(t.Boolean()),
  CanUseAiFeatures: t.Optional(t.Boolean()),
  CanSharePublicLinks: t.Optional(t.Boolean()),
  CanUploadImages: t.Optional(t.Boolean()),
  CanSendFriendRequests: t.Optional(t.Boolean()),
  CanUseCustomThemes: t.Optional(t.Boolean()),
});
