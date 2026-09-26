import { t } from 'elysia';

export const toggleReactionBodySchema = t.Object({
  Giftistry: t.Object({
    Comments: t.Object({
      Reaction: t.String(),
    }),
  }),
});
