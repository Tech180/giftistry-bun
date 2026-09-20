import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AppError } from '@/common/middlewares/error.middleware';
import { env } from '@/common/consts/runtime-config';
import { timingSafeEqualString } from '@/common/utils/public-app-url.util';
import type { SystemSettingsPayload } from '../domain/server-config.entity';
import type { SystemUseCases } from './system-use-cases.interface';

const SETUP_TOKEN_HEADER = 'x-giftistry-setup-token';

function assertSetupToken(request: Request, bodyToken?: string): void {
  const expected = env.GIFTISTRY_SETUP_TOKEN;
  if (!expected) return;

  const headerToken = request.headers.get(SETUP_TOKEN_HEADER) ?? '';
  const provided = headerToken || bodyToken || '';
  if (!provided || !timingSafeEqualString(provided, expected)) {
    throw new AppError('Invalid or missing setup token', 403, 'FORBIDDEN');
  }
}

const oauthSettingsFields = {
  PublicAppUrl: t.Optional(t.String()),
  OAuthEnabled: t.Optional(t.Boolean()),
  OAuthIssuerUrl: t.Optional(t.String()),
  OAuthClientId: t.Optional(t.String()),
  OAuthClientSecret: t.Optional(t.String()),
  OAuthScopes: t.Optional(t.String()),
  OAuthAutoRegister: t.Optional(t.Boolean()),
  OAuthAutoLaunch: t.Optional(t.Boolean()),
};

const systemPublicDetail = {
  tags: ['System'] as string[],
};

const systemOwnerDetail = {
  tags: ['System'] as string[],
  security: [{ bearerAuth: [] as string[] }],
};

export const systemRoutes = (useCases: SystemUseCases) => new Elysia({ prefix: '/api/system' })
  .get('/status', async () => {
    const status = await useCases.getSystemStatus.execute();
    return {
      success: true,
      ...status,
    };
  }, {
    detail: { ...systemPublicDetail, summary: 'System status' },
  })
  .post('/setup', async ({ body: { Giftistry: { Setup } }, request }) => {
    assertSetupToken(request, Setup.SetupToken);
    await useCases.runInitialSetup.execute(Setup);
    return { success: true };
  }, {
    detail: { ...systemPublicDetail, summary: 'Initial setup' },
    body: t.Object({
      Giftistry: t.Object({
        Setup: t.Object({
          SetupToken: t.Optional(t.String()),
          DbType: t.String(),
          DbUrl: t.Optional(t.String()),
          SmtpType: t.Optional(t.String()),
          SmtpHost: t.Optional(t.String()),
          SmtpPort: t.Optional(t.Numeric()),
          SmtpUser: t.Optional(t.String()),
          SmtpPass: t.Optional(t.String()),
          SmtpSecure: t.Optional(t.Boolean()),
          SmtpFrom: t.Optional(t.String()),
          Admin: t.Object({
            Username: t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }),
            Email: t.Optional(t.String()),
            Password: t.String({ minLength: 8 }),
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
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    const data = useCases.getSystemSettings.execute();
    return {
      success: true,
      data,
    };
  }, {
    detail: { ...systemOwnerDetail, summary: 'Get system settings' },
  })
  .get('/metadata-packs', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    const data = useCases.getMetadataPacks.execute();
    return {
      success: true,
      data,
    };
  }, {
    detail: { ...systemOwnerDetail, summary: 'List metadata enrichment packs' },
  })
  .post('/settings', async ({ getAuthUser, body: { Giftistry: { System: settings } } }) => {
    const user = await getAuthUser();
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    await useCases.saveSystemSettings.execute(settings as SystemSettingsPayload, {
      actorIsOwner: true,
    });
    return { success: true };
  }, {
    detail: { ...systemOwnerDetail, summary: 'Save system settings' },
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
          AllowSetup: t.Optional(t.Boolean()),
          ...oauthSettingsFields,
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
          AiImportChunkingEnabled: t.Optional(t.Boolean()),
          AiImportChunkItemLimit: t.Optional(t.Numeric()),
          AiEnabledPackIds: t.Optional(t.Array(t.String())),
          AiCustomPacks: t.Optional(
            t.Array(
              t.Object({
                Id: t.String(),
                Label: t.String(),
                Description: t.Optional(t.String()),
                Match: t.Optional(
                  t.Object({
                    Categories: t.Optional(t.Array(t.String())),
                    TitleKeywords: t.Optional(t.Array(t.String())),
                  })
                ),
                Fields: t.Optional(
                  t.Array(
                    t.Object({
                      Key: t.String(),
                      Label: t.String(),
                      Bucket: t.String(),
                      Hint: t.Optional(t.String()),
                    })
                  )
                ),
                PromptFragment: t.Optional(t.String()),
              })
            )
          ),
          AiCompletionTimeoutMs: t.Optional(t.Numeric()),
          AiConnectTimeoutMs: t.Optional(t.Numeric()),
          ScrapeFetchTimeoutMs: t.Optional(t.Numeric()),
          ScrapePlaywrightTimeoutMs: t.Optional(t.Numeric()),
          GrabInfoConcurrency: t.Optional(t.Numeric()),
          GrabInfoConcurrencyUnlimited: t.Optional(t.Boolean()),
          GrabInfoActiveStreamLimit: t.Optional(t.Numeric()),
          NtfyEnabled: t.Optional(t.Boolean()),
          NtfyBaseUrl: t.Optional(t.String()),
          NtfyAuthToken: t.Optional(t.String()),
          NtfyTopicPrefix: t.Optional(t.String()),
          WebPushEnabled: t.Optional(t.Boolean()),
          WebPushVapidPublicKey: t.Optional(t.String()),
          WebPushVapidPrivateKey: t.Optional(t.String()),
          WebPushSubject: t.Optional(t.String()),
          FcmEnabled: t.Optional(t.Boolean()),
          FcmProjectId: t.Optional(t.String()),
          FcmServiceAccountJson: t.Optional(t.String()),
        }),
      }),
    }),
  })
  .get('/push-config/public', async ({ getAuthUser }) => {
    await getAuthUser();
    const data = useCases.getPushConfigPublic.execute();
    return { success: true, data };
  }, {
    detail: { tags: ['System'] as string[], summary: 'Public push config', security: [{ bearerAuth: [] as string[] }] },
  })
  .post('/test-ntfy', async ({ getAuthUser }) => {
    const user = await getAuthUser();
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    const data = await useCases.testNtfy.execute();
    return { success: true, data };
  }, {
    detail: { ...systemOwnerDetail, summary: 'Publish ntfy test message' },
  })
  .post('/ai-check', async ({ getAuthUser, body: { Giftistry: { System: payload } } }) => {
    const user = await getAuthUser();
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
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
    detail: { ...systemOwnerDetail, summary: 'Test AI connection' },
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
    if (!user.IsOwner) {
      throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
    }

    const data = await useCases.listSystemModels.execute({
      Provider: query.Provider,
      Endpoint: query.Endpoint,
      ApiKey: query.ApiKey,
    });

    return { success: true, data };
  }, {
    detail: { ...systemOwnerDetail, summary: 'List AI models' },
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
    detail: { ...systemOwnerDetail, summary: 'Transfer ownership' },
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
  }, {
    detail: { ...systemOwnerDetail, summary: 'Delete server' },
  });
