import { t } from 'elysia';

export const unclaimItemBodySchema = t.Optional(
  t.Object({
    Giftistry: t.Object({
      Items: t.Object({
        IncludeLinked: t.Optional(t.Boolean()),
      }),
    }),
  })
);
