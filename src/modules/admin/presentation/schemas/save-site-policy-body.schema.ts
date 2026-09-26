import { t } from 'elysia';
import { sitePolicySchema } from './site-policy.schema';

export const saveSitePolicyBodySchema = t.Object({
  Giftistry: t.Object({
    SitePolicy: sitePolicySchema,
  }),
});
