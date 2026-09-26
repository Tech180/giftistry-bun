import { t } from 'elysia';

export const resetPasswordBodySchema = t.Object({
  Giftistry: t.Object({
    Password: t.Object({
      Password: t.String({ minLength: 6 }),
      ForcePasswordChange: t.Optional(t.Boolean()),
    }),
  }),
});
