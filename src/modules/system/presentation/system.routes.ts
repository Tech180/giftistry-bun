import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AppError } from '@/common/middlewares/error.middleware';
import type { SystemUseCases } from './system-use-cases.interface';

export const systemRoutes = (useCases: SystemUseCases) => new Elysia({ prefix: '/api/system' })
  .get('/status', async () => {
    const status = await useCases.getSystemStatus.execute();
    return {
      success: true,
      ...status,
    };
  })
  .post('/setup', async ({ body: { Giftistry: { Setup: payload } } }) => {
    await useCases.runInitialSetup.execute(payload);
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Setup: t.Object({
          dbType: t.String(),
          dbUrl: t.Optional(t.String()),
          smtpType: t.String(),
          smtpHost: t.Optional(t.String()),
          smtpPort: t.Optional(t.Numeric()),
          smtpUser: t.Optional(t.String()),
          smtpPass: t.Optional(t.String()),
          smtpSecure: t.Optional(t.Boolean()),
          smtpFrom: t.Optional(t.String()),
          admin: t.Object({
            username: t.String(),
            email: t.String(),
            password: t.String(),
            firstName: t.Optional(t.String()),
            lastName: t.Optional(t.String()),
          }),
        }),
      }),
    }),
  })
  .use(authMiddleware)
  .get('/settings', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const data = useCases.getSystemSettings.execute();
    return {
      success: true,
      data,
    };
  })
  .post('/settings', async ({ getAuthUser, body: { Giftistry: { System: settings } } }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    await useCases.saveSystemSettings.execute(settings);
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        System: t.Object({
          dbType: t.String(),
          dbUrl: t.Optional(t.String()),
          smtpType: t.String(),
          smtpHost: t.Optional(t.String()),
          smtpPort: t.Optional(t.Numeric()),
          smtpUser: t.Optional(t.String()),
          smtpPass: t.Optional(t.String()),
          smtpSecure: t.Optional(t.Boolean()),
          smtpFrom: t.Optional(t.String()),
          aiEnabled: t.Optional(t.Boolean()),
          aiProvider: t.Optional(t.String()),
          aiApiKey: t.Optional(t.String()),
          aiModel: t.Optional(t.String()),
          aiPrompt: t.Optional(t.String()),
          aiEndpoint: t.Optional(t.String()),
        }),
      }),
    }),
  })
  .post('/transfer-ownership', async ({ getAuthUser, body: { Giftistry: { Ownership: payload } }, request }) => {
    const actor = await getAuthUser();
    const result = await useCases.transferOwnership.execute(
      actor.Id,
      payload?.userId ?? '',
      request.headers.get('x-forwarded-for')
    );
    return {
      success: true,
      ...result,
    };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Ownership: t.Object({
          userId: t.String(),
        }),
      }),
    }),
  })
  .post('/delete-server', async ({ getAuthUser, request }) => {
    const actor = await getAuthUser();
    await useCases.deleteServer.execute(
      actor.Id,
      actor.Username,
      request.headers.get('x-forwarded-for')
    );
    return { success: true };
  });
