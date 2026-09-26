import { Elysia } from 'elysia';
import { ADMIN_SWAGGER_DETAIL } from '../constants/admin-swagger-detail.constant';
import type { RegistrationInviteRoutesDeps } from '../interfaces/registration-invite-routes-deps.interface';
import { idParamsSchema } from '../schemas/id-params.schema';

export const adminRoutes = ({ useCases, adminAuth }: RegistrationInviteRoutesDeps) =>
  new Elysia({ prefix: '/api/admin/registration-invite' })
    .use(adminAuth)
    .get(
      '/',
      async ({ getAdminUser }) => {
        await getAdminUser();
        const status = await useCases.getStatus.execute();
        return { success: true, ...status };
      },
      { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Registration invite status' } }
    )
    .post(
      '/regenerate',
      async ({ getAdminUser, request }) => {
        const admin = await getAdminUser();
        const result = await useCases.regenerate.execute(
          admin.Id,
          request.headers.get('x-forwarded-for')
        );
        return { success: true, ...result };
      },
      { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Generate registration invite' } }
    )
    .delete(
      '/:id',
      async ({ getAdminUser, params: { id }, request }) => {
        const admin = await getAdminUser();
        await useCases.deleteInvite.execute(
          admin.Id,
          id,
          request.headers.get('x-forwarded-for')
        );
        return { success: true };
      },
      {
        params: idParamsSchema,
        detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Delete registration invite' },
      }
    );
