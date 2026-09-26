import { t } from 'elysia';

export const claimItemBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Amount: t.Optional(t.Nullable(t.Numeric())),
      ClaimedByName: t.Optional(t.Nullable(t.String())),
      Anonymous: t.Optional(t.Boolean()),
      Quantity: t.Optional(t.Numeric()),
      Selection: t.Optional(t.Nullable(t.String())),
      IncludeLinked: t.Optional(t.Boolean()),
    }),
  }),
});
