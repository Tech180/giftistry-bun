import { t } from 'elysia';

export const itemSummarizeBodySchema = t.Object({
  Giftistry: t.Object({
    Jobs: t.Object({
      ListId: t.String(),
      ItemId: t.Optional(t.Nullable(t.String())),
      WriteBack: t.Optional(t.Boolean()),
      Name: t.String(),
      Text: t.Optional(t.Nullable(t.String())),
      LinkUrl: t.Optional(t.Nullable(t.String())),
      WebsiteName: t.Optional(t.Nullable(t.String())),
      Price: t.Optional(t.Nullable(t.Numeric())),
      Category: t.Optional(t.Nullable(t.String())),
      Priority: t.Optional(t.Nullable(t.Numeric())),
      CustomFields: t.Optional(
        t.Object({
          Predefined: t.Optional(t.Record(t.String(), t.Nullable(t.String()))),
          UserDefined: t.Optional(t.Record(t.String(), t.String())),
        })
      ),
      Variations: t.Optional(
        t.Array(
          t.Object({
            Name: t.String(),
            Quantity: t.Numeric(),
          })
        )
      ),
      DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
    }),
  }),
});
