import { t } from 'elysia';

export const searchUsersQuerySchema = t.Object({
  q: t.String(),
});
