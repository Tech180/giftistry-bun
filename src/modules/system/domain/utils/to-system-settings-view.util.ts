import { AI_DEFAULT_PROMPTS } from '../prompts';
import {
  sanitizeCustomPacks,
  sanitizeEnabledPackIdsForConfig,
  toCustomPackSettingsDto,
} from '../packs';
import { DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT } from '../constants/ai-import-chunk.constant';
import {
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
  DEFAULT_AI_CONNECT_TIMEOUT_MS,
} from '../constants/ai-timeout.constant';
import {
  DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT,
  DEFAULT_GRAB_INFO_CONCURRENCY,
} from '../constants/grab-info.constant';
import {
  DEFAULT_SCRAPE_FETCH_TIMEOUT_MS,
  DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS,
} from '../constants/scrape-timeout.constant';
import type { ServerConfig } from '../interfaces/server-config.interface';
import type { SystemSettingsView } from '../interfaces/system-settings-view.interface';
import {
  clampAiCompletionTimeoutMs,
  clampAiConnectTimeoutMs,
  clampAiImportChunkItemLimit,
  clampGrabInfoActiveStreamLimit,
  clampGrabInfoConcurrency,
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
} from './clamp-server-config-limits.util';
import { maskSecret } from './mask-secret.util';
import { normalizeAiProvider } from './normalize-ai-provider.util';
import { normalizeGrabInfoConcurrencyUnlimited } from './normalize-grab-info-concurrency-unlimited.util';

export function toSystemSettingsView(config: ServerConfig): SystemSettingsView {
  return {
    DbType: config.DbType,
    DbUrl: config.DbUrl || '',
    SmtpType: config.SmtpType,
    SmtpHost: config.SmtpHost || '',
    SmtpPort: config.SmtpPort !== undefined ? config.SmtpPort : 1025,
    SmtpUser: config.SmtpUser || '',
    SmtpPass: maskSecret(config.SmtpPass),
    SmtpSecure: !!config.SmtpSecure,
    SmtpFrom: config.SmtpFrom || 'noreply@giftistry.local',
    PublicAppUrl: config.PublicAppUrl || '',
    AllowSetup: config.AllowSetup !== false,
    OAuthEnabled: !!config.OAuthEnabled,
    OAuthIssuerUrl: config.OAuthIssuerUrl || '',
    OAuthClientId: config.OAuthClientId || '',
    OAuthClientSecret: maskSecret(config.OAuthClientSecret),
    OAuthScopes: config.OAuthScopes || 'openid email profile',
    OAuthAutoRegister: config.OAuthAutoRegister !== false,
    OAuthAutoLaunch: !!config.OAuthAutoLaunch,
    AiEnabled: !!config.AiEnabled,
    AiWebSearchEnabled: !!config.AiWebSearchEnabled,
    AiRateLimitEnabled: config.AiRateLimitEnabled !== false,
    AiFastProvider: normalizeAiProvider(config.AiFastProvider),
    AiFastEndpoint: config.AiFastEndpoint || '',
    AiFastApiKey: maskSecret(config.AiFastApiKey),
    AiFastModel: config.AiFastModel || '',
    AiIntelligentProvider: normalizeAiProvider(config.AiIntelligentProvider),
    AiIntelligentEndpoint: config.AiIntelligentEndpoint || '',
    AiIntelligentApiKey: maskSecret(config.AiIntelligentApiKey),
    AiIntelligentModel: config.AiIntelligentModel || '',
    AiPrompt: config.AiPrompt || '',
    AiDescriptionPrompt: config.AiDescriptionPrompt || '',
    AiPopulatePrompt: config.AiPopulatePrompt || '',
    AiCategoryPrompt: config.AiCategoryPrompt || '',
    AiImportPrompt: config.AiImportPrompt || '',
    AiImportChunkingEnabled: config.AiImportChunkingEnabled !== false,
    AiImportChunkItemLimit: clampAiImportChunkItemLimit(
      config.AiImportChunkItemLimit ?? DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT
    ),
    AiEnabledPackIds: sanitizeEnabledPackIdsForConfig(config),
    AiCustomPacks: sanitizeCustomPacks(config.AiCustomPacks).map(toCustomPackSettingsDto),
    AiCompletionTimeoutMs: clampAiCompletionTimeoutMs(
      config.AiCompletionTimeoutMs ?? DEFAULT_AI_COMPLETION_TIMEOUT_MS
    ),
    AiConnectTimeoutMs: clampAiConnectTimeoutMs(
      config.AiConnectTimeoutMs ?? DEFAULT_AI_CONNECT_TIMEOUT_MS
    ),
    ScrapeFetchTimeoutMs: clampScrapeFetchTimeoutMs(
      config.ScrapeFetchTimeoutMs ?? DEFAULT_SCRAPE_FETCH_TIMEOUT_MS
    ),
    ScrapePlaywrightTimeoutMs: clampScrapePlaywrightTimeoutMs(
      config.ScrapePlaywrightTimeoutMs ?? DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS
    ),
    GrabInfoConcurrency: clampGrabInfoConcurrency(
      config.GrabInfoConcurrency ?? DEFAULT_GRAB_INFO_CONCURRENCY
    ),
    GrabInfoConcurrencyUnlimited: normalizeGrabInfoConcurrencyUnlimited(
      config.GrabInfoConcurrencyUnlimited
    ),
    GrabInfoActiveStreamLimit: clampGrabInfoActiveStreamLimit(
      config.GrabInfoActiveStreamLimit ?? DEFAULT_GRAB_INFO_ACTIVE_STREAM_LIMIT
    ),
    NtfyEnabled: !!config.NtfyEnabled,
    NtfyBaseUrl: config.NtfyBaseUrl || 'https://ntfy.sh',
    NtfyAuthToken: maskSecret(config.NtfyAuthToken),
    NtfyTopicPrefix: config.NtfyTopicPrefix || 'giftistry',
    WebPushEnabled: !!config.WebPushEnabled,
    WebPushVapidPublicKey: config.WebPushVapidPublicKey || '',
    WebPushVapidPrivateKey: maskSecret(config.WebPushVapidPrivateKey),
    WebPushSubject: config.WebPushSubject || 'mailto:admin@localhost',
    FcmEnabled: !!config.FcmEnabled,
    FcmProjectId: config.FcmProjectId || '',
    FcmServiceAccountJson: maskSecret(config.FcmServiceAccountJson),
    AiDefaultPrompts: {
      Review: AI_DEFAULT_PROMPTS.review,
      Description: AI_DEFAULT_PROMPTS.description,
      Populate: AI_DEFAULT_PROMPTS.populate,
      Category: AI_DEFAULT_PROMPTS.category,
      Import: AI_DEFAULT_PROMPTS.import,
    },
  };
}
