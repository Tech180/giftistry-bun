import { t } from 'elysia';

export const updateProfileBodySchema = t.Object({
  Giftistry: t.Object({
    Auth: t.Object({
      Username: t.Optional(t.String({ minLength: 3, maxLength: 32 })),
      FirstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
      LastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
      Bio: t.Optional(t.Nullable(t.String())),
      Theme: t.Optional(t.Nullable(t.String())),
      Avatar: t.Optional(t.Nullable(t.String())),
      AiEnabled: t.Optional(t.Boolean()),
      WebSearchEnabled: t.Optional(t.Boolean()),
    }),
  }),
});
