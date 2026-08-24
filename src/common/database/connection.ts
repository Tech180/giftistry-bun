import postgres from 'postgres';
import { env } from '../consts/env.consts';
import * as fs from 'fs';
import { getConfigFilePath } from '@/common/utils/config-path.util';
import { normalizeAiProvider, type AiProvider } from '@/modules/system/domain/server-config.entity';
import type { CustomPackSettingsDto } from '@/modules/system/domain/packs';

export interface SystemConfig {
  DbType: 'local' | 'remote';
  DbUrl?: string;
  SmtpType: 'local' | 'remote';
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  /** Public-facing SPA origin (emails, WebAuthn, CORS). Overridable by GIFTISTRY_PUBLIC_APP_URL. */
  PublicAppUrl?: string;
  /** When false, first-run setup is sealed. Env GIFTISTRY_ALLOW_SETUP can still block. */
  AllowSetup?: boolean;
  /** Server owner first-run onboarding completed once. */
  OwnerOnboardingCompleted?: boolean;
  /** @deprecated Prefer OwnerOnboardingCompleted; still read for migration. */
  AdminOnboardingCompleted?: boolean;
  OAuthEnabled?: boolean;
  OAuthIssuerUrl?: string;
  OAuthClientId?: string;
  OAuthClientSecret?: string;
  OAuthScopes?: string;
  OAuthButtonText?: string;
  OAuthAutoRegister?: boolean;
  OAuthAutoLaunch?: boolean;
  AiEnabled?: boolean;
  AiWebSearchEnabled?: boolean;
  AiRateLimitEnabled?: boolean;
  AiFastProvider?: AiProvider;
  AiFastEndpoint?: string;
  AiFastApiKey?: string;
  AiFastModel?: string;
  AiIntelligentProvider?: AiProvider;
  AiIntelligentEndpoint?: string;
  AiIntelligentApiKey?: string;
  AiIntelligentModel?: string;
  AiPrompt?: string;
  AiDescriptionPrompt?: string;
  AiPopulatePrompt?: string;
  AiCategoryPrompt?: string;
  AiImportPrompt?: string;
  AiEnabledPackIds?: string[];
  AiCustomPacks?: CustomPackSettingsDto[];
  AiCompletionTimeoutMs?: number;
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
  GrabInfoConcurrency?: number;
  GrabInfoConcurrencyUnlimited?: boolean;
  GrabInfoActiveStreamLimit?: number;
  NtfyEnabled?: boolean;
  NtfyBaseUrl?: string;
  NtfyAuthToken?: string;
  NtfyTopicPrefix?: string;
  WebPushEnabled?: boolean;
  WebPushVapidPublicKey?: string;
  WebPushVapidPrivateKey?: string;
  WebPushSubject?: string;
  FcmEnabled?: boolean;
  FcmProjectId?: string;
  FcmServiceAccountJson?: string;
}

function pick<T>(data: Record<string, unknown>, key: string, fallback: T): T {
  if (data[key] !== undefined && data[key] !== null) return data[key] as T;
  return fallback;
}

function hasKey(data: Record<string, unknown>, key: string): boolean {
  return data[key] !== undefined;
}

function normalizeConfig(data: Record<string, unknown>): SystemConfig {
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
      if (ownerValue !== undefined) return Boolean(ownerValue);
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
    OAuthButtonText: String(pick(data, 'OAuthButtonText', '')).trim() || undefined,
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

function needsConfigRewrite(data: Record<string, unknown>): boolean {
  const hasLegacyModel = data.AiModel !== undefined;
  const missingFast = data.AiFastModel === undefined;
  const missingIntelligent = data.AiIntelligentModel === undefined;
  const hasSharedTrio =
    data.AiProvider !== undefined ||
    data.AiEndpoint !== undefined ||
    data.AiApiKey !== undefined;
  const missingSlotProviders =
    !hasKey(data, 'AiFastProvider') || !hasKey(data, 'AiIntelligentProvider');
  return (
    hasLegacyModel ||
    missingFast ||
    missingIntelligent ||
    hasSharedTrio ||
    missingSlotProviders
  );
}

export function loadConfig(): SystemConfig {
  const configPath = getConfigFilePath();
  if (fs.existsSync(configPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
      const config = normalizeConfig(data);
      if (needsConfigRewrite(data)) {
        saveConfig(config);
      }
      return config;
    } catch {
      // ignore
    }
  }
  return {
    DbType: 'local',
    SmtpType: 'local',
    AllowSetup: true,
    AiRateLimitEnabled: true,
    AiFastProvider: 'openrouter',
    AiIntelligentProvider: 'openrouter',
  };
}

export function saveConfig(config: SystemConfig) {
  const configPath = getConfigFilePath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  reinitializeDbConnection();
}

function createSqlClient(config: SystemConfig) {
  if (config.DbType === 'remote' && config.DbUrl) {
    return postgres(config.DbUrl, {
      max: 10,
      idle_timeout: 5,
    });
  } else {
    return postgres({
      host: env.PGHOST,
      port: env.PGPORT,
      username: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      max: 10,
      idle_timeout: 5,
    });
  }
}

let activeSql = createSqlClient(loadConfig());

export function reinitializeDbConnection() {
  const config = loadConfig();
  const oldSql = activeSql;
  activeSql = createSqlClient(config);
  try {
    oldSql.end();
  } catch (err) {
    console.error('Error closing old DB pool:', err);
  }
}

// Export sql as a Proxy that redirects all calls/properties to activeSql
export const sql = new Proxy(() => {}, {
  get(target, prop, receiver) {
    if (prop === 'then') {
      // Avoid resolving the proxy function as a Promise
      return undefined;
    }
    const val = Reflect.get(activeSql, prop);
    if (typeof val === 'function') {
      return val.bind(activeSql);
    }
    return val;
  },
  apply(target, thisArg, argumentsList) {
    return Reflect.apply(activeSql as any, activeSql, argumentsList);
  }
}) as unknown as typeof activeSql;
