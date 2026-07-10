import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AdminUser } from '../domain/admin-user.entity';
import type { AdminUseCases } from './admin-use-cases.interface';

export const adminRoutes = (useCases: AdminUseCases) => new Elysia({ prefix: '/api/admin' })
  .use(authMiddleware)
  .get('/overview', async ({ getAuthUser }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getOverview.execute();
    return { success: true, ...result };
  })
  .get('/users', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.listUsers.execute(query);
    return { success: true, ...result };
  })
  .post('/users', async ({ getAuthUser, body: { Giftistry: { AdminUser: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    const result = await useCases.createUser.execute(
      admin.Id,
      payload,
      request.headers.get('x-forwarded-for')
    );
    return { success: true, ...result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        AdminUser: t.Object({
          username: t.String(),
          email: t.String(),
          password: t.String(),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          isAdmin: t.Optional(t.Boolean()),
          emailVerified: t.Optional(t.Boolean()),
          forcePasswordChange: t.Optional(t.Boolean()),
          policy: t.Optional(t.Any()),
        }),
      }),
    }),
  })
  .get('/users/:id', async ({ getAuthUser, params: { id } }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getUser.execute(id);
    return { success: true, ...result };
  })
  .patch('/users/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { User: updates } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.updateUser.execute(admin.Id, id, updates, request.headers.get('x-forwarded-for'));
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        User: t.Object({
          username: t.Optional(t.String()),
          email: t.Optional(t.String()),
          firstName: t.Optional(t.String()),
          lastName: t.Optional(t.String()),
          bio: t.Optional(t.String()),
          avatar: t.Optional(t.Union([t.String(), t.Null()])),
          emailVerified: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .patch('/users/:id/policy', async ({ getAuthUser, params: { id }, body: { Giftistry: { Policy: policyPayload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.updateUserPolicy.execute(
      admin.Id,
      id,
      policyPayload,
      request.headers.get('x-forwarded-for')
    );
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Policy: t.Object({
          isAdmin: t.Optional(t.Boolean()),
          isDisabled: t.Optional(t.Boolean()),
          isHidden: t.Optional(t.Boolean()),
          forcePasswordChange: t.Optional(t.Boolean()),
          loginAttemptsBeforeLockout: t.Optional(t.Number()),
          policy: t.Optional(t.Any()),
        }),
      }),
    }),
  })
  .post('/users/:id/reset-password', async ({ getAuthUser, params: { id }, body: { Giftistry: { Password: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.resetPassword.execute(admin.Id, id, payload, request.headers.get('x-forwarded-for'));
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Password: t.Object({
          password: t.String(),
          forcePasswordChange: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .post('/users/:id/unlock', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.unlockUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .post('/users/:id/revoke-sessions', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.revokeSessions.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .delete('/users/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.deleteUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .get('/site-policy', async ({ getAuthUser }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getSitePolicy.execute();
    return { success: true, ...result };
  })
  .patch('/site-policy', async ({ getAuthUser, body: { Giftistry: { SitePolicy: policy } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    const result = await useCases.saveSitePolicy.execute(
      admin.Id,
      policy,
      request.headers.get('x-forwarded-for')
    );
    return { success: true, ...result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        SitePolicy: t.Any(),
      }),
    }),
  })
  .get('/audit', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.listAuditLog.execute(query);
    return { success: true, ...result };
  })
  .get('/moderation/comments', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.moderateComment.list(query);
    return { success: true, ...result };
  })
  .delete('/moderation/comments/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.moderateComment.delete(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .get('/reports', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.handleReport.list(query);
    return { success: true, ...result };
  })
  .patch('/reports/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { Report: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.handleReport.handle(
      admin.Id,
      id,
      payload.status,
      request.headers.get('x-forwarded-for')
    );
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Report: t.Object({
          status: t.Union([t.Literal('open'), t.Literal('resolved'), t.Literal('dismissed')]),
        }),
      }),
    }),
  });
