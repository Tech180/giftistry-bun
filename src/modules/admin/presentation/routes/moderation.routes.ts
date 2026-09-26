import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';

export const moderationRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get('/moderation/comments', async ({ getAdminUser, query }) => {
      await getAdminUser();
      const result = await useCases.moderateComment.list(query);
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'List moderated comments' } })
    .delete('/moderation/comments/:id', async ({ getAdminUser, params: { id }, request }) => {
      const admin = await getAdminUser();
      await useCases.moderateComment.delete(admin.Id, id, request.headers.get('x-forwarded-for'));
      return { success: true };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Delete moderated comment' } });
