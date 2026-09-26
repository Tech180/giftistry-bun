import { t } from 'elysia';

export const aiCheckBodySchema = t.Object({
  Giftistry: t.Object({
    System: t.Object({
      AiProvider: t.String(),
      AiEndpoint: t.Optional(t.Nullable(t.String())),
      AiApiKey: t.Optional(t.Nullable(t.String())),
      AiFastModel: t.Optional(t.Nullable(t.String())),
      AiIntelligentModel: t.Optional(t.Nullable(t.String())),
      AiModelSlot: t.Optional(t.Union([t.Literal('fast'), t.Literal('intelligent')])),
    }),
  }),
});
