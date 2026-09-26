import { t } from 'elysia';

export const itemEnrichBodySchema = t.Object({
  Giftistry: t.Object({
    Jobs: t.Object({
      Intent: t.Union([
        t.Literal('create-from-url'),
        t.Literal('update-item'),
        t.Literal('draft-populate'),
      ]),
      ListId: t.String(),
      Url: t.String(),
      ItemId: t.Optional(t.Nullable(t.String())),
    }),
  }),
});
