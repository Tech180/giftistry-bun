import { t } from 'elysia';

export const importGifBodySchema = t.Object({
  Giftistry: t.Object({
    Gifs: t.Object({
      ImageUrl: t.String(),
    }),
  }),
});
