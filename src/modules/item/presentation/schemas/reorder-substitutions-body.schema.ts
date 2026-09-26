import { t } from 'elysia';

export const reorderSubstitutionsBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      OrderedIds: t.Array(t.String()),
    }),
  }),
});
