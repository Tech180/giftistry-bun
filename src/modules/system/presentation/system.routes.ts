import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AppError } from '@/common/middlewares/error.middleware';
import type { SystemUseCases } from './system-use-cases.interface';
import type { SetupPayload, SystemSettingsPayload } from '../domain/server-config.entity';

function mapSetupPayload(raw: {
  DbType: string;
  DbUrl?: string;
  SmtpType: string;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  Admin: {
    Username: string;
    Email: string;
    Password: string;
    FirstName?: string;
    LastName?: string;
  };
}): SetupPayload {
  return {
    dbType: raw.DbType,
    dbUrl: raw.DbUrl,
    smtpType: raw.SmtpType,
    smtpHost: raw.SmtpHost,
    smtpPort: raw.SmtpPort,
    smtpUser: raw.SmtpUser,
    smtpPass: raw.SmtpPass,
    smtpSecure: raw.SmtpSecure,
    smtpFrom: raw.SmtpFrom,
    admin: {
      username: raw.Admin.Username,
      email: raw.Admin.Email,
      password: raw.Admin.Password,
      firstName: raw.Admin.FirstName,
      lastName: raw.Admin.LastName,
    },
  };
}

function mapSystemSettingsPayload(raw: {
  DbType: string;
  DbUrl?: string;
  SmtpType: string;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  AiEnabled?: boolean;
  AiProvider?: string;
  AiApiKey?: string;
  AiModel?: string;
  AiPrompt?: string;
  AiDescriptionPrompt?: string;
  AiPopulatePrompt?: string;
  AiCategoryPrompt?: string;
  AiEndpoint?: string;
}): SystemSettingsPayload {
  return {
    dbType: raw.DbType,
    dbUrl: raw.DbUrl,
    smtpType: raw.SmtpType,
    smtpHost: raw.SmtpHost,
    smtpPort: raw.SmtpPort,
    smtpUser: raw.SmtpUser,
    smtpPass: raw.SmtpPass,
    smtpSecure: raw.SmtpSecure,
    smtpFrom: raw.SmtpFrom,
    aiEnabled: raw.AiEnabled,
    aiProvider: raw.AiProvider,
    aiApiKey: raw.AiApiKey,
    aiModel: raw.AiModel,
    aiPrompt: raw.AiPrompt,
    aiDescriptionPrompt: raw.AiDescriptionPrompt,
    aiPopulatePrompt: raw.AiPopulatePrompt,
    aiCategoryPrompt: raw.AiCategoryPrompt,
    aiEndpoint: raw.AiEndpoint,
  };
}

export const systemRoutes = (useCases: SystemUseCases) => new Elysia({ prefix: '/api/system' })
  .get('/status', async () => {
    const status = await useCases.getSystemStatus.execute();
    return {
      success: true,
      ...status,
    };
  })
  .post('/setup', async ({ body: { Giftistry: { Setup } } }) => {
    await useCases.runInitialSetup.execute(mapSetupPayload(Setup));
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

    await useCases.saveSystemSettings.execute(mapSystemSettingsPayload(settings));
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
          AiProvider: t.Optional(t.String()),
          AiApiKey: t.Optional(t.String()),
          AiModel: t.Optional(t.String()),
          AiPrompt: t.Optional(t.String()),
          AiDescriptionPrompt: t.Optional(t.String()),
          AiPopulatePrompt: t.Optional(t.String()),
          AiCategoryPrompt: t.Optional(t.String()),
          AiEndpoint: t.Optional(t.String()),
        }),
      }),
    }),
  })
  .post('/ai-check', async ({ getAuthUser, body: { Giftistry: { System: payload } } }) => {
    const user = await getAuthUser();
    if (!user.IsAdmin) {
      throw new AppError('Forbidden: Admin access required', 403, 'FORBIDDEN');
    }

    const result = await useCases.testAiConnection.execute({
      aiProvider: payload.AiProvider || 'local',
      aiEndpoint: payload.AiEndpoint,
      aiApiKey: payload.AiApiKey,
      aiModel: payload.AiModel,
    });

    return { success: true, data: result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        System: t.Object({
          AiProvider: t.String(),
          AiEndpoint: t.Optional(t.Nullable(t.String())),
          AiApiKey: t.Optional(t.Nullable(t.String())),
          AiModel: t.Optional(t.Nullable(t.String())),
        }),
      }),
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
