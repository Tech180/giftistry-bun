import { t } from 'elysia';

export const createReportBodySchema = t.Object({
  Giftistry: t.Object({
    Report: t.Object({
      TargetType: t.Union([
        t.Literal('comment'),
        t.Literal('wishlist'),
        t.Literal('user'),
      ]),
      TargetId: t.String(),
      Reason: t.Optional(t.String()),
    }),
  }),
});
