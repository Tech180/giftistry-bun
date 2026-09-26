import { t } from 'elysia';

export const invitePasswordBodySchema = t.Optional(
  t.Object({
    Giftistry: t.Object({
      Invites: t.Object({
        Password: t.Optional(t.String()),
      }),
    }),
  })
);
