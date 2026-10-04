import { DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT } from '../constants/ai-import-chunk.constant';
import {
  DEFAULT_AI_METADATA_EXTRACTION_PRESET,
  DEFAULT_AI_METADATA_SPLIT_PACK_CALLS,
} from '../constants/ai-metadata-extraction.constant';
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
import {
  clampAiCompletionTimeoutMs,
  clampAiConnectTimeoutMs,
  clampAiImportChunkItemLimit,
  clampAiPageContextMaxChars,
  clampAiPopulateMaxTokens,
  clampAiWebSearchMaxPages,
  clampGrabInfoActiveStreamLimit,
  clampGrabInfoConcurrency,
  clampScrapeFetchTimeoutMs,
  clampScrapePlaywrightTimeoutMs,
} from './clamp-server-config-limits.util';
import { DEFAULT_AI_WEB_SEARCH_MAX_PAGES } from '../constants/ai-web-search.constant';
import { normalizeAiMetadataExtractionPreset } from './normalize-ai-metadata-extraction-preset.util';
import { normalizeAiProvider } from './normalize-ai-provider.util';
import { normalizeGrabInfoConcurrencyUnlimited } from './normalize-grab-info-concurrency-unlimited.util';
import { resolveAiMetadataExtractionOptions } from './resolve-ai-metadata-extraction-options.util';

/**
 * Full on-disk config shape: every supported key present with a concrete value
 * (no `undefined`, so JSON.stringify never drops options).
 * Does not persist deprecated AdminOnboardingCompleted.
 *
 * AiPageContextMaxChars / AiPopulateMaxTokens use 0 to mean "no cap / omit max_tokens"
 * (full preset default). Positive values are clamped overrides or preset defaults.
 */
export function buildPersistedServerConfig(
  config: ServerConfig = { DbType: 'local', SmtpType: 'local' }
): ServerConfig {
  const extraction = resolveAiMetadataExtractionOptions(config);
  return {
    DbType: config.DbType === 'remote' ? 'remote' : 'local',
    DbUrl: config.DbUrl ?? '',
    SmtpType: config.SmtpType === 'remote' ? 'remote' : 'local',
    SmtpHost: config.SmtpHost ?? '',
    SmtpPort: config.SmtpPort !== undefined ? Number(config.SmtpPort) : 1025,
    SmtpUser: config.SmtpUser ?? '',
    SmtpPass: config.SmtpPass ?? '',
    SmtpSecure: config.SmtpSecure === true,
    SmtpFrom: config.SmtpFrom ?? 'noreply@giftistry.local',
    PublicAppUrl: config.PublicAppUrl ?? '',
    AllowSetup: config.AllowSetup !== false,
    OwnerOnboardingCompleted: config.OwnerOnboardingCompleted === true,
    OAuthEnabled: config.OAuthEnabled === true,
    OAuthIssuerUrl: config.OAuthIssuerUrl ?? '',
    OAuthClientId: config.OAuthClientId ?? '',
    OAuthClientSecret: config.OAuthClientSecret ?? '',
    OAuthScopes: config.OAuthScopes ?? '',
    OAuthAutoRegister: config.OAuthAutoRegister !== false,
    OAuthAutoLaunch: config.OAuthAutoLaunch === true,
    AiEnabled: config.AiEnabled === true,
    AiWebSearchEnabled: config.AiWebSearchEnabled === true,
    AiWebSearchEndpoint: (config.AiWebSearchEndpoint ?? '').trim().replace(/\/+$/, ''),
    AiWebSearchMaxPages: clampAiWebSearchMaxPages(
      config.AiWebSearchMaxPages ?? DEFAULT_AI_WEB_SEARCH_MAX_PAGES
    ),
    AiRateLimitEnabled: config.AiRateLimitEnabled !== false,
    AiFastProvider: normalizeAiProvider(config.AiFastProvider),
    AiFastEndpoint: config.AiFastEndpoint ?? '',
    AiFastApiKey: config.AiFastApiKey ?? '',
    AiFastModel: config.AiFastModel ?? '',
    AiIntelligentProvider: normalizeAiProvider(config.AiIntelligentProvider),
    AiIntelligentEndpoint: config.AiIntelligentEndpoint ?? '',
    AiIntelligentApiKey: config.AiIntelligentApiKey ?? '',
    AiIntelligentModel: config.AiIntelligentModel ?? '',
    AiPrompt: config.AiPrompt ?? '',
    AiDescriptionPrompt: config.AiDescriptionPrompt ?? '',
    AiPopulatePrompt: config.AiPopulatePrompt ?? '',
    AiCategoryPrompt: config.AiCategoryPrompt ?? '',
    AiImportPrompt: config.AiImportPrompt ?? '',
    AiImportChunkingEnabled: config.AiImportChunkingEnabled !== false,
    AiImportChunkItemLimit: clampAiImportChunkItemLimit(
      config.AiImportChunkItemLimit ?? DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT
    ),
    AiMetadataExtractionPreset: normalizeAiMetadataExtractionPreset(
      config.AiMetadataExtractionPreset ?? DEFAULT_AI_METADATA_EXTRACTION_PRESET
    ),
    AiPageContextMaxChars:
      config.AiPageContextMaxChars != null && config.AiPageContextMaxChars > 0
        ? clampAiPageContextMaxChars(config.AiPageContextMaxChars)
        : (extraction.pageContextMaxChars ?? 0),
    AiPopulateMaxTokens:
      config.AiPopulateMaxTokens != null && config.AiPopulateMaxTokens > 0
        ? clampAiPopulateMaxTokens(config.AiPopulateMaxTokens)
        : (extraction.populateMaxTokens ?? 0),
    AiMetadataSplitPackCalls:
      config.AiMetadataSplitPackCalls ?? DEFAULT_AI_METADATA_SPLIT_PACK_CALLS,
    AiEnabledPackIds: Array.isArray(config.AiEnabledPackIds) ? [...config.AiEnabledPackIds] : [],
    AiCustomPacks: Array.isArray(config.AiCustomPacks) ? [...config.AiCustomPacks] : [],
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
    NtfyEnabled: config.NtfyEnabled === true,
    NtfyBaseUrl: config.NtfyBaseUrl ?? 'https://ntfy.sh',
    NtfyAuthToken: config.NtfyAuthToken ?? '',
    NtfyTopicPrefix: config.NtfyTopicPrefix ?? 'giftistry',
    WebPushEnabled: config.WebPushEnabled === true,
    WebPushVapidPublicKey: config.WebPushVapidPublicKey ?? '',
    WebPushVapidPrivateKey: config.WebPushVapidPrivateKey ?? '',
    WebPushSubject: config.WebPushSubject ?? 'mailto:admin@localhost',
    FcmEnabled: config.FcmEnabled === true,
    FcmProjectId: config.FcmProjectId ?? '',
    FcmServiceAccountJson: config.FcmServiceAccountJson ?? '',
    GiphyApiKey: config.GiphyApiKey ?? '',
  };
}
