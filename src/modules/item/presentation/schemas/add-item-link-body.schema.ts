import { t } from 'elysia';

export const addItemLinkBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Url: t.String(),
    }),
  }),
});
