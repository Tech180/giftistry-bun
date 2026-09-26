import { t } from 'elysia';

export const tutorialBodySchema = t.Object({
  Giftistry: t.Object({
    Tutorial: t.Object({
      FirstRunDismissed: t.Optional(t.Boolean()),
      CompleteChapter: t.Optional(t.String()),
      SkipChapter: t.Optional(t.String()),
      ResetChapter: t.Optional(t.String()),
      ResetAll: t.Optional(t.Boolean()),
    }),
  }),
});
