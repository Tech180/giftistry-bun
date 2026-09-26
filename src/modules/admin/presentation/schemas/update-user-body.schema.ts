import { t } from 'elysia';

export const updateUserBodySchema = t.Object({
  Giftistry: t.Object({
    User: t.Object({
      Username: t.Optional(t.String({ minLength: 3, maxLength: 32 })),
      Email: t.Optional(t.String()),
      FirstName: t.Optional(t.String()),
      LastName: t.Optional(t.String()),
      Bio: t.Optional(t.String()),
      Avatar: t.Optional(t.Union([t.String(), t.Null()])),
      EmailVerified: t.Optional(t.Boolean()),
    }),
  }),
});
