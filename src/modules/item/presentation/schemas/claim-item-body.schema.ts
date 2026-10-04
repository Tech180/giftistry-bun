import { t } from 'elysia';
import { MONEY_MAX_AMOUNT } from '@/common/domain/constants/money-limits.constant';

export const claimItemBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Amount: t.Optional(t.Nullable(t.Numeric({ minimum: 0, maximum: MONEY_MAX_AMOUNT }))),
      ClaimedByName: t.Optional(t.Nullable(t.String())),
      Anonymous: t.Optional(t.Boolean()),
      Quantity: t.Optional(t.Numeric()),
      Selection: t.Optional(t.Nullable(t.String())),
      IncludeLinked: t.Optional(t.Boolean()),
    }),
  }),
});
