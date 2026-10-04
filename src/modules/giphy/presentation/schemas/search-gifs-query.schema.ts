import { t } from 'elysia';

export const searchGifsQuerySchema = t.Object({
  q: t.Optional(t.String()),
  limit: t.Optional(t.Numeric()),
});
