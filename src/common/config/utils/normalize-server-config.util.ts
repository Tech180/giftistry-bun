import {
  normalizeAiProvider,
  PERSISTED_SERVER_CONFIG_KEYS,
  type ServerConfig,
} from '@/modules/system';
import type { CustomPackSettingsDto } from '@/modules/system';

function pick<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  if (data[key] !== undefined && data[key] !== null) {
    return data[key] as T;
  }
  return fallback;
}

function hasKey(data: Record<string, unknown>, key: string): boolean {
  return data[key] !== undefined;
}

export function normalizeServerConfig(data: Record<string, unknown>): ServerConfig {
  const legacyModel = String(pick(data, 'AiModel', '')).trim();
  const hasFast = hasKey(data, 'AiFastModel');
  const hasIntelligent = hasKey(data, 'AiIntelligentModel');
  const fastModel = hasFast ? String(pick(data, 'AiFastModel', '')).trim() : legacyModel;
  const intelligentModel = hasIntelligent
    ? String(pick(data, 'AiIntelligentModel', '')).trim()
    : legacyModel;

  const legacyProvider = pick<unknown>(data, 'AiProvider', undefined);
  const legacyEndpoint = String(pick(data, 'AiEndpoint', '')).trim();
  const legacyApiKey = String(pick(data, 'AiApiKey', '')).trim();

  const fastProviderRaw = hasKey(data, 'AiFastProvider')
    ? pick(data, 'AiFastProvider', legacyProvider)
    : legacyProvider;
  const intelligentProviderRaw = hasKey(data, 'AiIntelligentProvider')
    ? pick(data, 'AiIntelligentProvider', legacyProvider)
    : legacyProvider;

  const fastEndpoint = hasKey(data, 'AiFastEndpoint')
    ? String(pick(data, 'AiFastEndpoint', '')).trim()
    : legacyEndpoint;
  const intelligentEndpoint = hasKey(data, 'AiIntelligentEndpoint')
    ? String(pick(data, 'AiIntelligentEndpoint', '')).trim()
    : legacyEndpoint;

  const fastApiKey = hasKey(data, 'AiFastApiKey')
    ? String(pick(data, 'AiFastApiKey', '')).trim()
    : legacyApiKey;
  const intelligentApiKey = hasKey(data, 'AiIntelligentApiKey')
    ? String(pick(data, 'AiIntelligentApiKey', '')).trim()
    : legacyApiKey;

  const rateLimitRaw = pick<unknown>(data, 'AiRateLimitEnabled', undefined);

  return {
    DbType: pick(data, 'DbType', 'local' as const),
    DbUrl: pick(data, 'DbUrl', ''),
    SmtpType: pick(data, 'SmtpType', 'local' as const),
    SmtpHost: pick(data, 'SmtpHost', ''),
    SmtpPort: (() => {
      const value = pick<unknown>(data, 'SmtpPort', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    SmtpUser: pick(data, 'SmtpUser', ''),
    SmtpPass: pick(data, 'SmtpPass', ''),
    SmtpSecure: (() => {
      const value = pick<unknown>(data, 'SmtpSecure', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    SmtpFrom: pick(data, 'SmtpFrom', ''),
    PublicAppUrl: String(pick(data, 'PublicAppUrl', '')).trim() || undefined,
    AllowSetup: (() => {
      const value = pick<unknown>(data, 'AllowSetup', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    OwnerOnboardingCompleted: (() => {
      const ownerValue = pick<unknown>(data, 'OwnerOnboardingCompleted', undefined);
      if (ownerValue !== undefined) {
        return Boolean(ownerValue);
      }
      const legacyValue = pick<unknown>(data, 'AdminOnboardingCompleted', undefined);
      return legacyValue !== undefined ? Boolean(legacyValue) : undefined;
    })(),
    AdminOnboardingCompleted: (() => {
      const value = pick<unknown>(data, 'AdminOnboardingCompleted', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    OAuthEnabled: (() => {
      const value = pick<unknown>(data, 'OAuthEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    OAuthIssuerUrl: String(pick(data, 'OAuthIssuerUrl', '')).trim() || undefined,
    OAuthClientId: String(pick(data, 'OAuthClientId', '')).trim() || undefined,
    OAuthClientSecret: String(pick(data, 'OAuthClientSecret', '')).trim() || undefined,
    OAuthScopes: String(pick(data, 'OAuthScopes', '')).trim() || undefined,
    OAuthAutoRegister: (() => {
      const value = pick<unknown>(data, 'OAuthAutoRegister', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    OAuthAutoLaunch: (() => {
      const value = pick<unknown>(data, 'OAuthAutoLaunch', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    AiEnabled: (() => {
      const value = pick<unknown>(data, 'AiEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    AiWebSearchEnabled: (() => {
      const value = pick<unknown>(data, 'AiWebSearchEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    AiRateLimitEnabled: rateLimitRaw !== undefined ? Boolean(rateLimitRaw) : true,
    AiFastProvider: normalizeAiProvider(fastProviderRaw ?? 'openrouter'),
    AiFastEndpoint: fastEndpoint,
    AiFastApiKey: fastApiKey,
    AiFastModel: fastModel,
    AiIntelligentProvider: normalizeAiProvider(intelligentProviderRaw ?? 'openrouter'),
    AiIntelligentEndpoint: intelligentEndpoint,
    AiIntelligentApiKey: intelligentApiKey,
    AiIntelligentModel: intelligentModel,
    AiPrompt: pick(data, 'AiPrompt', ''),
    AiDescriptionPrompt: pick(data, 'AiDescriptionPrompt', ''),
    AiPopulatePrompt: pick(data, 'AiPopulatePrompt', ''),
    AiCategoryPrompt: pick(data, 'AiCategoryPrompt', ''),
    AiImportPrompt: pick(data, 'AiImportPrompt', ''),
    AiImportChunkingEnabled: (() => {
      const value = pick<unknown>(data, 'AiImportChunkingEnabled', undefined);
      return value !== undefined ? Boolean(value) : true;
    })(),
    AiImportChunkItemLimit: (() => {
      const value = pick<unknown>(data, 'AiImportChunkItemLimit', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    AiEnabledPackIds: (() => {
      if (!hasKey(data, 'AiEnabledPackIds') || !Array.isArray(data.AiEnabledPackIds)) {
        return undefined;
      }
      return data.AiEnabledPackIds.filter((id): id is string => typeof id === 'string');
    })(),
    AiCustomPacks: (() => {
      if (!hasKey(data, 'AiCustomPacks') || !Array.isArray(data.AiCustomPacks)) {
        return undefined;
      }
      return data.AiCustomPacks as CustomPackSettingsDto[];
    })(),
    AiCompletionTimeoutMs: (() => {
      const value = pick<unknown>(data, 'AiCompletionTimeoutMs', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    AiConnectTimeoutMs: (() => {
      const value = pick<unknown>(data, 'AiConnectTimeoutMs', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    ScrapeFetchTimeoutMs: (() => {
      const value = pick<unknown>(data, 'ScrapeFetchTimeoutMs', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    ScrapePlaywrightTimeoutMs: (() => {
      const value = pick<unknown>(data, 'ScrapePlaywrightTimeoutMs', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    GrabInfoConcurrency: (() => {
      const value = pick<unknown>(data, 'GrabInfoConcurrency', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    GrabInfoConcurrencyUnlimited: (() => {
      const value = pick<unknown>(data, 'GrabInfoConcurrencyUnlimited', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    GrabInfoActiveStreamLimit: (() => {
      const value = pick<unknown>(data, 'GrabInfoActiveStreamLimit', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    NtfyEnabled: (() => {
      const value = pick<unknown>(data, 'NtfyEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    NtfyBaseUrl: String(pick(data, 'NtfyBaseUrl', '')).trim() || undefined,
    NtfyAuthToken: String(pick(data, 'NtfyAuthToken', '')).trim() || undefined,
    NtfyTopicPrefix: String(pick(data, 'NtfyTopicPrefix', '')).trim() || undefined,
    WebPushEnabled: (() => {
      const value = pick<unknown>(data, 'WebPushEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    WebPushVapidPublicKey: String(pick(data, 'WebPushVapidPublicKey', '')).trim() || undefined,
    WebPushVapidPrivateKey: String(pick(data, 'WebPushVapidPrivateKey', '')).trim() || undefined,
    WebPushSubject: String(pick(data, 'WebPushSubject', '')).trim() || undefined,
    FcmEnabled: (() => {
      const value = pick<unknown>(data, 'FcmEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    FcmProjectId: String(pick(data, 'FcmProjectId', '')).trim() || undefined,
    FcmServiceAccountJson: String(pick(data, 'FcmServiceAccountJson', '')).trim() || undefined,
  };
}

export function needsServerConfigRewrite(data: Record<string, unknown>): boolean {
  const hasLegacyModel = data.AiModel !== undefined;
  const missingFast = data.AiFastModel === undefined;
  const missingIntelligent = data.AiIntelligentModel === undefined;
  const hasSharedTrio =
    data.AiProvider !== undefined ||
    data.AiEndpoint !== undefined ||
    data.AiApiKey !== undefined;
  const missingSlotProviders =
    !hasKey(data, 'AiFastProvider') || !hasKey(data, 'AiIntelligentProvider');
  const missingPersistedKey = PERSISTED_SERVER_CONFIG_KEYS.some((key) => !hasKey(data, key));
  return (
    hasLegacyModel ||
    missingFast ||
    missingIntelligent ||
    hasSharedTrio ||
    missingSlotProviders ||
    missingPersistedKey
  );
}
