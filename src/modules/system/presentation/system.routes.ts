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
  .post('/setup', async ({ body: { Giftistry: { Setup } } }) => {
    await useCases.runInitialSetup.execute(Setup);
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Setup: t.Object({
          DbType: t.String(),
          DbUrl: t.Optional(t.String()),
          SmtpType: t.String(),
          SmtpHost: t.Optional(t.String()),
          SmtpPort: t.Optional(t.Numeric()),
          SmtpUser: t.Optional(t.String()),
          SmtpPass: t.Optional(t.String()),
          SmtpSecure: t.Optional(t.Boolean()),
          SmtpFrom: t.Optional(t.String()),
          Admin: t.Object({
            Username: t.String(),
            Email: t.String(),
            Password: t.String(),
            FirstName: t.Optional(t.String()),
            LastName: t.Optional(t.String()),
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
          DbType: t.String(),
          DbUrl: t.Optional(t.String()),
          SmtpType: t.String(),
          SmtpHost: t.Optional(t.String()),
          SmtpPort: t.Optional(t.Numeric()),
          SmtpUser: t.Optional(t.String()),
          SmtpPass: t.Optional(t.String()),
          SmtpSecure: t.Optional(t.Boolean()),
          SmtpFrom: t.Optional(t.String()),
          AiEnabled: t.Optional(t.Boolean()),
          AiWebSearchEnabled: t.Optional(t.Boolean()),
          AiRateLimitEnabled: t.Optional(t.Boolean()),
          AiFastProvider: t.Optional(t.String()),
          AiFastEndpoint: t.Optional(t.String()),
          AiFastApiKey: t.Optional(t.String()),
          AiFastModel: t.Optional(t.String()),
          AiIntelligentProvider: t.Optional(t.String()),
          AiIntelligentEndpoint: t.Optional(t.String()),
          AiIntelligentApiKey: t.Optional(t.String()),
          AiIntelligentModel: t.Optional(t.String()),
          AiPrompt: t.Optional(t.String()),
          AiDescriptionPrompt: t.Optional(t.String()),
          AiPopulatePrompt: t.Optional(t.String()),
          AiCategoryPrompt: t.Optional(t.String()),
          AiImportPrompt: t.Optional(t.String()),
          AiCompletionTimeoutMs: t.Optional(t.Numeric()),
          ScrapeFetchTimeoutMs: t.Optional(t.Numeric()),
          ScrapePlaywrightTimeoutMs: t.Optional(t.Numeric()),
        }),
      }),
    }),
  })
  .post('/ai-check', async ({ getAuthUser, body: { Giftistry: { System: payload } } }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const slot = payload.AiModelSlot === 'intelligent' ? 'intelligent' : 'fast';
    const model =
      slot === 'intelligent'
        ? payload.AiIntelligentModel
        : payload.AiFastModel;

    const result = await useCases.testAiConnection.execute({
      AiProvider: payload.AiProvider || 'local',
      AiEndpoint: payload.AiEndpoint,
      AiApiKey: payload.AiApiKey,
      AiModel: model,
    });

    return { success: true, data: result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        System: t.Object({
          AiProvider: t.String(),
          AiEndpoint: t.Optional(t.Nullable(t.String())),
          AiApiKey: t.Optional(t.Nullable(t.String())),
          AiFastModel: t.Optional(t.Nullable(t.String())),
          AiIntelligentModel: t.Optional(t.Nullable(t.String())),
          AiModelSlot: t.Optional(t.Union([t.Literal('fast'), t.Literal('intelligent')])),
        }),
      }),
    }),
  })
  .get('/models', async ({ getAuthUser, query }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const data = await useCases.listSystemModels.execute({
      Provider: query.Provider,
      Endpoint: query.Endpoint,
      ApiKey: query.ApiKey,
    });

    return { success: true, data };
  }, {
    query: t.Object({
      Provider: t.String(),
      Endpoint: t.Optional(t.String()),
      ApiKey: t.Optional(t.String()),
    }),
  })
  .post('/transfer-ownership', async ({ getAuthUser, body: { Giftistry: { Ownership: payload } }, request }) => {
    const actor = await getAuthUser();
    const result = await useCases.transferOwnership.execute(
      actor.Id,
      payload?.UserId ?? '',
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
          UserId: t.String(),
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
