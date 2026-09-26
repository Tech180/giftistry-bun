import { t } from 'elysia';

export const friendRequestIdParamsSchema = t.Object({
  requestId: t.String(),
});
