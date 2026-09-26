import { t } from 'elysia';

export const changePasswordBodySchema = t.Object({
  Giftistry: t.Object({
    Auth: t.Object({
      CurrentPassword: t.String({ minLength: 1 }),
      NewPassword: t.String({ minLength: 6 }),
    }),
  }),
});
