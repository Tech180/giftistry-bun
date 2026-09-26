import { t } from 'elysia';

export const registerPushBodySchema = t.Object({
  Giftistry: t.Object({
    Push: t.Object({
      Platform: t.Union([t.Literal('ios'), t.Literal('android')]),
      Transport: t.Union([t.Literal('ntfy'), t.Literal('webpush'), t.Literal('fcm')]),
      Endpoint: t.Optional(t.String()),
      Keys: t.Optional(
        t.Object({
          P256dh: t.Optional(t.String()),
          Auth: t.Optional(t.String()),
        })
      ),
      IsPrimary: t.Optional(t.Boolean()),
    }),
  }),
});
