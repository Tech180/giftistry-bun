import { t } from 'elysia';

export const tokenParamsSchema = t.Object({
  token: t.String({ minLength: 1 }),
});
