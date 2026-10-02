import { t } from 'elysia';

export const capturePageBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Url: t.String(),
      Html: t.String({ maxLength: 2_200_000 }),
      CapturedJson: t.Optional(t.Array(t.Unknown())),
      ListId: t.Optional(t.String()),
    }),
  }),
});
