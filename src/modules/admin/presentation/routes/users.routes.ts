import { Elysia } from 'elysia';
import type { AdminAuthMiddleware } from '../interfaces/admin-auth-middleware.type';
import type { UseCases } from '../interfaces/use-cases.interface';
import { ADMIN_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import { createUserBodySchema } from '../schemas/create-user-body.schema';
import { updateUserBodySchema } from '../schemas/update-user-body.schema';
import { resetPasswordBodySchema } from '../schemas/reset-password-body.schema';
import { mapCreateUserPayload } from '../utils/map-create-user-payload.util';
import { mapUpdateUserPayload } from '../utils/map-update-user-payload.util';
import { mapResetPasswordPayload } from '../utils/map-reset-password-payload.util';

export const usersRoutes = (useCases: UseCases, adminAuth: AdminAuthMiddleware) =>
  new Elysia()
    .use(adminAuth)
    .get('/users', async ({ getAdminUser, query }) => {
      await getAdminUser();
      const result = await useCases.listUsers.execute(query);
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'List users' } })
    .post('/users', async ({ getAdminUser, body: { Giftistry: { AdminUser: payload } }, request }) => {
      const admin = await getAdminUser();
      const result = await useCases.createUser.execute(
        admin.Id,
        mapCreateUserPayload(payload),
        request.headers.get('x-forwarded-for')
      );
      return { success: true, ...result };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Create user' },
      body: createUserBodySchema,
    })
    .get('/users/:id', async ({ getAdminUser, params: { id } }) => {
      await getAdminUser();
      const result = await useCases.getUser.execute(id);
      return { success: true, ...result };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Get user' } })
    .patch('/users/:id', async ({ getAdminUser, params: { id }, body: { Giftistry: { User: updates } }, request }) => {
      const admin = await getAdminUser();
      await useCases.updateUser.execute(admin.Id, id, mapUpdateUserPayload(updates), request.headers.get('x-forwarded-for'));
      return { success: true };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Update user' },
      body: updateUserBodySchema,
    })
    .post('/users/:id/reset-password', async ({ getAdminUser, params: { id }, body: { Giftistry: { Password: payload } }, request }) => {
      const admin = await getAdminUser();
      await useCases.resetPassword.execute(admin.Id, id, mapResetPasswordPayload(payload), request.headers.get('x-forwarded-for'));
      return { success: true };
    }, {
      detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Reset user password' },
      body: resetPasswordBodySchema,
    })
    .post('/users/:id/unlock', async ({ getAdminUser, params: { id }, request }) => {
      const admin = await getAdminUser();
      await useCases.unlockUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
      return { success: true };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Unlock user' } })
    .post('/users/:id/revoke-sessions', async ({ getAdminUser, params: { id }, request }) => {
      const admin = await getAdminUser();
      await useCases.revokeSessions.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
      return { success: true };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Revoke user sessions' } })
    .delete('/users/:id', async ({ getAdminUser, params: { id }, request }) => {
      const admin = await getAdminUser();
      await useCases.deleteUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
      return { success: true };
    }, { detail: { ...ADMIN_SWAGGER_DETAIL, summary: 'Delete user' } });
