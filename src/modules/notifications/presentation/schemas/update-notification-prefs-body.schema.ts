import { t } from 'elysia';

export const updateNotificationPrefsBodySchema = t.Object({
  Giftistry: t.Object({
    Notifications: t.Object({
      EmailAlerts: t.Optional(t.Boolean()),
      Marketing: t.Optional(t.Boolean()),
      FriendRequests: t.Optional(t.Boolean()),
      ListShares: t.Optional(t.Boolean()),
      ItemClaims: t.Optional(t.Boolean()),
      Comments: t.Optional(t.Boolean()),
      JobCompletions: t.Optional(t.Boolean()),
      PushAlerts: t.Optional(t.Boolean()),
    }),
  }),
});
