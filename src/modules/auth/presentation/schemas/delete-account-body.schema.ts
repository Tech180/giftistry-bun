import { t } from 'elysia';

export const deleteAccountBodySchema = t.Object({
  Giftistry: t.Object({
    Auth: t.Object({
      Password: t.String(),
    }),
  }),
});
