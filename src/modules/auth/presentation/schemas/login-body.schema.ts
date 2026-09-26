import { t } from 'elysia';

export const loginBodySchema = t.Object({
  Giftistry: t.Object({
    Auth: t.Object({
      Username: t.String(),
      Password: t.String(),
    }),
  }),
});
