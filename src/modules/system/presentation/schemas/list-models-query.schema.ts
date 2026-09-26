import { t } from 'elysia';

export const listModelsQuerySchema = t.Object({
  Provider: t.String(),
  Endpoint: t.Optional(t.String()),
  ApiKey: t.Optional(t.String()),
});
