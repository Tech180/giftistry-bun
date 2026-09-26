import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import { handleReportBodySchema } from '../schemas/handle-report-body.schema';

export const reportsAdminRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get('/reports', async ({ getAdminUser, query }) => {
      await getAdminUser();
      const result = await useCases.handleReport.list(query);
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'List reports' } })
    .patch('/reports/:id', async ({ getAdminUser, params: { id }, body: { Giftistry: { Report: payload } }, request }) => {
      const admin = await getAdminUser();
      await useCases.handleReport.handle(
        admin.Id,
        id,
        payload.Status,
        request.headers.get('x-forwarded-for')
      );
      return { success: true };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Handle report' },
      body: handleReportBodySchema,
    });
