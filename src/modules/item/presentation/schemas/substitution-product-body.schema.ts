import { t } from 'elysia';
import { substitutionMetadataSchema } from './substitution-metadata.schema';

export const substitutionProductBodySchema = t.Object({
  Giftistry: t.Object({
    Items: t.Object({
      Name: t.String({ minLength: 1 }),
      Description: t.Optional(t.Nullable(t.String())),
      LinkUrl: t.Optional(t.Nullable(t.String())),
      Price: t.Optional(t.Nullable(t.Numeric())),
      WebsiteName: t.Optional(t.Nullable(t.String())),
      Category: t.Optional(t.Nullable(t.String())),
      PriorityId: t.Optional(t.Nullable(t.String())),
      Priority: t.Optional(t.Nullable(t.Numeric())),
      IsHiddenIdea: t.Optional(t.Nullable(t.Boolean())),
      Metadata: substitutionMetadataSchema,
    }),
  }),
});
