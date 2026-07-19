import { AI_DEFAULT_PROMPTS } from './ai-default-prompts';

export type DbConnectionType = 'local' | 'remote';
export type SmtpConnectionType = 'local' | 'remote';
/** Settings and slot connections only support local + OpenRouter. */
export type AiProvider = 'local' | 'openrouter';

export interface ServerConfig {
  DbType: DbConnectionType;
  DbUrl?: string;
  SmtpType: SmtpConnectionType;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  PublicAppUrl?: string;
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
  AiCompletionTimeoutMs?: number;
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
}

export interface AdminSetupCredentials {
  Username: string;
  Email?: string;
  Password: string;
  FirstName?: string;
  LastName?: string;
}

export interface SetupPayload {
  DbType: string;
  DbUrl?: string;
  /** Optional; defaults to local (env/Mailpit) when omitted from first-run setup. */
  SmtpType?: string;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  Admin: AdminSetupCredentials;
  SetupToken?: string;
}

export interface SystemSettingsPayload {
  DbType: string;
  DbUrl?: string;
  SmtpType: string;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  PublicAppUrl?: string;
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
  AiFastProvider?: string;
  AiFastEndpoint?: string;
  AiFastApiKey?: string;
  AiFastModel?: string;
  AiIntelligentProvider?: string;
  AiIntelligentEndpoint?: string;
  AiIntelligentApiKey?: string;
  AiIntelligentModel?: string;
  AiPrompt?: string;
  AiDescriptionPrompt?: string;
  AiPopulatePrompt?: string;
  AiCategoryPrompt?: string;
  AiImportPrompt?: string;
  AiCompletionTimeoutMs?: number;
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
}

export interface SystemSettingsView {
  DbType: DbConnectionType;
  DbUrl: string;
  SmtpType: SmtpConnectionType;
  SmtpHost: string;
  SmtpPort: number;
  SmtpUser: string;
  SmtpPass: string;
  SmtpSecure: boolean;
  SmtpFrom: string;
  PublicAppUrl: string;
  AllowSetup: boolean;
  OAuthEnabled: boolean;
  OAuthIssuerUrl: string;
  OAuthClientId: string;
  OAuthClientSecret: string;
  OAuthScopes: string;
  OAuthButtonText: string;
  OAuthAutoRegister: boolean;
  OAuthAutoLaunch: boolean;
  AiEnabled: boolean;
  AiWebSearchEnabled: boolean;
  AiRateLimitEnabled: boolean;
  AiFastProvider: AiProvider;
  AiFastEndpoint: string;
  AiFastApiKey: string;
  AiFastModel: string;
  AiIntelligentProvider: AiProvider;
  AiIntelligentEndpoint: string;
  AiIntelligentApiKey: string;
  AiIntelligentModel: string;
  AiPrompt: string;
  AiDescriptionPrompt: string;
  AiPopulatePrompt: string;
  AiCategoryPrompt: string;
  AiImportPrompt: string;
  AiCompletionTimeoutMs: number;
  ScrapeFetchTimeoutMs: number;
  ScrapePlaywrightTimeoutMs: number;
  AiDefaultPrompts: {
    Review: string;
    Description: string;
    Populate: string;
    Category: string;
    Import: string;
  };
}

export interface TransferTargetUser {
  id: string;
  username: string;
  isDisabled: boolean;
}

export interface CreateAdminUserParams {
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  authHash: string;
}

const MASKED_SECRET = '******';

export const DEFAULT_SCRAPE_FETCH_TIMEOUT_MS = 8000;
export const DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS = 25000;
export const SCRAPE_FETCH_TIMEOUT_MIN_MS = 1000;
export const SCRAPE_FETCH_TIMEOUT_MAX_MS = 60_000;
export const SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS = 1000;
export const SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS = 120_000;

export const DEFAULT_AI_COMPLETION_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_COMPLETION_TIMEOUT_MIN_MS = 30_000;
export const AI_COMPLETION_TIMEOUT_MAX_MS = 30 * 60 * 1000;

export function normalizeAiProvider(value: unknown): AiProvider {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  return raw === 'local' ? 'local' : 'openrouter';
}

export function clampScrapeFetchTimeoutMs(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SCRAPE_FETCH_TIMEOUT_MS;
  return Math.min(
    SCRAPE_FETCH_TIMEOUT_MAX_MS,
    Math.max(SCRAPE_FETCH_TIMEOUT_MIN_MS, Math.round(n))
  );
}

export function clampScrapePlaywrightTimeoutMs(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS;
  return Math.min(
    SCRAPE_PLAYWRIGHT_TIMEOUT_MAX_MS,
    Math.max(SCRAPE_PLAYWRIGHT_TIMEOUT_MIN_MS, Math.round(n))
  );
}

export function clampAiCompletionTimeoutMs(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_AI_COMPLETION_TIMEOUT_MS;
  return Math.min(
    AI_COMPLETION_TIMEOUT_MAX_MS,
    Math.max(AI_COMPLETION_TIMEOUT_MIN_MS, Math.round(n))
  );
}

export function maskSecret(value?: string): string {
  return value ? MASKED_SECRET : '';
}

export function resolveMaskedSecret(incoming: string | undefined, existing: string | undefined): string {
  if (incoming === MASKED_SECRET) {
    return existing || '';
  }
  return incoming || '';
}

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
    OAuthButtonText: config.OAuthButtonText || 'Sign in with SSO',
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
    AiCompletionTimeoutMs: clampAiCompletionTimeoutMs(
      config.AiCompletionTimeoutMs ?? DEFAULT_AI_COMPLETION_TIMEOUT_MS
    ),
    ScrapeFetchTimeoutMs: clampScrapeFetchTimeoutMs(
      config.ScrapeFetchTimeoutMs ?? DEFAULT_SCRAPE_FETCH_TIMEOUT_MS
    ),
    ScrapePlaywrightTimeoutMs: clampScrapePlaywrightTimeoutMs(
      config.ScrapePlaywrightTimeoutMs ?? DEFAULT_SCRAPE_PLAYWRIGHT_TIMEOUT_MS
    ),
    AiDefaultPrompts: {
      Review: AI_DEFAULT_PROMPTS.review,
      Description: AI_DEFAULT_PROMPTS.description,
      Populate: AI_DEFAULT_PROMPTS.populate,
      Category: AI_DEFAULT_PROMPTS.category,
      Import: AI_DEFAULT_PROMPTS.import,
    },
  };
}
