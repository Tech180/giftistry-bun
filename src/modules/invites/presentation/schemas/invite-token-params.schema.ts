import { t } from 'elysia';

export const inviteTokenParamsSchema = t.Object({
  token: t.String(),
});
