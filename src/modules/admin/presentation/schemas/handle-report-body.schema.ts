import { t } from 'elysia';

export const handleReportBodySchema = t.Object({
  Giftistry: t.Object({
    Report: t.Object({
      Status: t.Union([t.Literal('open'), t.Literal('resolved'), t.Literal('dismissed')]),
    }),
  }),
});
