import { t } from 'elysia';

export const sendFriendRequestBodySchema = t.Object({
  Giftistry: t.Object({
    Friends: t.Object({
      ReceiverId: t.String(),
    }),
  }),
});
