import { t } from 'elysia';

export const syncItemTargetsBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      TargetItemIds: t.Array(t.String()),
    }),
  }),
});
