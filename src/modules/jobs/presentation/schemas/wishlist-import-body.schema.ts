import { t } from 'elysia';

export const wishlistImportBodySchema = t.Object({
  Giftistry: t.Object({
    Jobs: t.Object({
      Mode: t.Union([t.Literal('create-list'), t.Literal('existing-list')]),
      ListId: t.Optional(t.Nullable(t.String())),
      Title: t.Optional(t.Nullable(t.String())),
      FileName: t.String(),
      Format: t.Optional(t.Nullable(t.String())),
      Content: t.String(),
      ContentEncoding: t.Union([
        t.Literal('text'),
        t.Literal('base64'),
        t.Literal('data-url'),
      ]),
      GrabInfo: t.Optional(t.Boolean()),
      AllowAi: t.Optional(t.Boolean()),
      OptimizeCategories: t.Optional(t.Boolean()),
    }),
  }),
});
