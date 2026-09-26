import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';

export const auditRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get('/audit', async ({ getAdminUser, query }) => {
      await getAdminUser();
      const result = await useCases.listAuditLog.execute(query);
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Audit log' } });
