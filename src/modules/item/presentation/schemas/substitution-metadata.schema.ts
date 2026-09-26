import { t } from 'elysia';

export const substitutionMetadataSchema = t.Optional(
  t.Nullable(
    t.Object({
      Text: t.Optional(t.Nullable(t.String())),
      CustomFields: t.Optional(
        t.Nullable(
          t.Object({
            Predefined: t.Optional(t.Nullable(t.Record(t.String(), t.Nullable(t.String())))),
            UserDefined: t.Optional(t.Nullable(t.Record(t.String(), t.String()))),
          })
        )
      ),
      DesiredQuantity: t.Optional(t.Nullable(t.Numeric())),
      Variations: t.Optional(
        t.Nullable(
          t.Array(
            t.Object({
              Name: t.String(),
              Quantity: t.Numeric(),
            })
          )
        )
      ),
      MultiCount: t.Optional(t.Nullable(t.Boolean())),
      IsFavorite: t.Optional(t.Nullable(t.Boolean())),
      IsPinned: t.Optional(t.Nullable(t.Boolean())),
      Photos: t.Optional(
        t.Nullable(
          t.Array(
            t.Object({
              DataUrl: t.String(),
            }),
            { maxItems: 10 }
          )
        )
      ),
    })
  )
);
