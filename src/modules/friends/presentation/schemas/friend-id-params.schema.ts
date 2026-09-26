import { t } from 'elysia';

export const friendIdParamsSchema = t.Object({
  friendId: t.String(),
});
