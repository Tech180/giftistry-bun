import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import type { CreateReportUseCase } from '../application/create-report.use-case';

export interface ReportsRoutesDeps {
  createReport: CreateReportUseCase;
}

export const reportsRoutes = (deps: ReportsRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(authMiddleware)
    .post(
      '/reports',
      async ({ getAuthUser, body: { Giftistry: { Report } } }) => {
        const user = await getAuthUser();
        await deps.createReport.execute(user.userId, {
          targetType: Report.TargetType,
          targetId: Report.TargetId,
          reason: Report.Reason,
        });
        return { success: true };
      },
      {
        body: t.Object({
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
        }),
        detail: {
          tags: ['Reports'],
          summary: 'Submit a content report',
          security: [{ bearerAuth: [] }],
        },
      }
    );
