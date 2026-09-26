import { t } from 'elysia';

export const transferOwnershipBodySchema = t.Object({
  Giftistry: t.Object({
    Ownership: t.Object({
      UserId: t.String(),
    }),
  }),
});
