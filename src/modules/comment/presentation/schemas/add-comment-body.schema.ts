import { t } from 'elysia';

export const addCommentBodySchema = t.Object({
  Giftistry: t.Object({
    Comments: t.Object({
      Content: t.String(),
      CommenterName: t.Optional(t.Nullable(t.String())),
      IsOwnerVisible: t.Optional(t.Boolean()),
      IsRollover: t.Optional(t.Boolean()),
      ParentId: t.Optional(t.Nullable(t.String())),
      ImageUrl: t.Optional(t.Nullable(t.String())),
      VisibleToUserIds: t.Optional(t.Nullable(t.Array(t.String()))),
    }),
  }),
});
