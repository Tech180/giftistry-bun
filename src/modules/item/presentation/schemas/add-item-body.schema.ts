import { t } from 'elysia';
import { itemMetadataSchema } from './item-metadata.schema';

export const addItemBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Name: t.String(),
      Description: t.Optional(t.Nullable(t.String())),
      PriorityId: t.Optional(t.Nullable(t.String())),
      IsHiddenIdea: t.Optional(t.Boolean()),
      LinkUrl: t.Optional(t.Nullable(t.String())),
      Price: t.Optional(t.Nullable(t.Numeric())),
      WebsiteName: t.Optional(t.Nullable(t.String())),
      Category: t.Optional(t.Nullable(t.String())),
      IsSuggestion: t.Optional(t.Boolean()),
      Priority: t.Optional(t.Nullable(t.Numeric())),
      SharedWithUserIds: t.Optional(t.Array(t.String())),
      Metadata: itemMetadataSchema,
    }),
  }),
});
