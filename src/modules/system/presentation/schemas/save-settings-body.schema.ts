import { t } from 'elysia';

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

export const saveSettingsBodySchema = t.Object({
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
});
