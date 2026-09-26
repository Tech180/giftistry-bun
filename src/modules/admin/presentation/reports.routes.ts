import { Elysia } from 'elysia';
import type { ReportsRoutesDeps } from './interfaces/reports-routes-deps.interface';
import { createReportBodySchema } from './schemas/create-report-body.schema';

export const reportsRoutes = (deps: ReportsRoutesDeps) =>
  new Elysia({ prefix: '/api' })
    .use(deps.authMiddleware)
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
        body: createReportBodySchema,
        detail: {
          tags: ['Reports'],
          summary: 'Submit a content report',
          security: [{ bearerAuth: [] }],
        },
      }
    );
