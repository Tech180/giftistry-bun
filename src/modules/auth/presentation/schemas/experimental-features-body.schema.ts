import { t } from 'elysia';

export const experimentalFeaturesBodySchema = t.Object({
  Giftistry: t.Object({
    ExperimentalFeatures: t.Object({
      ProductTutorial: t.Optional(t.Boolean()),
    }),
  }),
});
